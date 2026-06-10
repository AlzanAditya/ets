-- ============================================================
-- 011_business_logic_functions.sql
-- Phase 3 — Server-side business logic (SECURITY DEFINER)
--
-- Functions:
--   1. generate_transaction_code()      → TEXT
--   2. validate_product_transition()    → VOID (raises on invalid)
--   3. approve_transaction()            → transactions row
--   4. cancel_transaction()             → transactions row
--
-- CRITICAL: All functions are SECURITY DEFINER — they run with
--           the privileges of the definer (postgres/service_role),
--           not the caller. RLS is bypassed inside these functions.
--           Role validation is therefore done EXPLICITLY inside each
--           function via auth.uid() lookups.
--
-- MUST run AFTER 010_setup_rls.sql
-- ============================================================

BEGIN;

-- ── 1. generate_transaction_code() ───────────────────────────────────────────
-- Generates a collision-safe, sequential per-day transaction code.
-- Format: TRX-YYYYMMDD-NNNN (e.g. TRX-20260609-0001)
--
-- Uses a per-day Postgres sequence. The sequence is created lazily on
-- the first call of each day. Sequences are atomic — concurrent inserts
-- cannot produce the same number.
--
-- Usage: Called as DEFAULT value in transactions table, or inside
--        approve_transaction() when creating transaction.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date     TEXT    := TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD');
  v_seq_name TEXT    := 'trx_seq_' || v_date;
  v_next     BIGINT;
BEGIN
  -- Create per-day sequence if it does not exist yet
  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = v_seq_name
  ) THEN
    EXECUTE FORMAT(
      'CREATE SEQUENCE public.%I START 1 INCREMENT 1 NO CYCLE',
      v_seq_name
    );
  END IF;

  -- Get next value — atomic, collision-safe
  EXECUTE FORMAT('SELECT nextval(%L)', 'public.' || v_seq_name) INTO v_next;

  RETURN FORMAT('TRX-%s-%s', v_date, LPAD(v_next::TEXT, 4, '0'));
END;
$$;

COMMENT ON FUNCTION generate_transaction_code() IS
  'Generates sequential per-day transaction codes (TRX-YYYYMMDD-NNNN). '
  'Collision-safe via Postgres sequence. Call server-side only.';

-- ── 2. validate_product_transition() ─────────────────────────────────────────
-- Enforces the product state machine.
-- RAISES an exception if the transition is not allowed.
--
-- Allowed transition matrix (see review doc for full matrix):
--   active      → deployed, sold, maintenance, inactive, retired*
--   deployed    → active, sold, maintenance, inactive*, retired*
--   sold        → retired* only
--   maintenance → active, deployed, inactive, retired*
--   inactive    → active, deployed, maintenance, retired*
--   retired     → NOTHING (terminal state)
--   * retired requires super_admin role
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_product_transition(
  p_from TEXT,
  p_to   TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- No-op if status is not changing
  IF p_from = p_to THEN RETURN; END IF;

  -- Terminal state: nothing can leave 'retired'
  IF p_from = 'retired' THEN
    RAISE EXCEPTION 'Product is retired and cannot change status (terminal state)';
  END IF;

  -- 'sold' can only move to 'retired' (no reactivation)
  IF p_from = 'sold' AND p_to != 'retired' THEN
    RAISE EXCEPTION
      'Sold assets cannot be reactivated. Create a return transaction instead. (tried: sold → %)', p_to;
  END IF;

  -- Validate caller role for 'retired' target
  IF p_to = 'retired' THEN
    SELECT role INTO v_caller_role
    FROM admins
    WHERE id = auth.uid() AND deleted_at IS NULL;

    IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
      RAISE EXCEPTION 'Only super_admin can retire assets (current role: %)', COALESCE(v_caller_role, 'unauthenticated');
    END IF;
  END IF;

  -- deployed → inactive is not a valid direct transition
  -- (must return first, then mark inactive)
  IF p_from = 'deployed' AND p_to = 'inactive' THEN
    RAISE EXCEPTION 'Deployed assets must be returned (create return transaction) before marking inactive';
  END IF;

  -- All other transitions are allowed
END;
$$;

COMMENT ON FUNCTION validate_product_transition(TEXT, TEXT) IS
  'Enforces product state machine rules. Raises EXCEPTION on invalid transition. '
  'Call before any product status update.';

-- ── 3. approve_transaction() ──────────────────────────────────────────────────
-- Approves a pending transaction atomically:
--   1. Validates caller is admin/super_admin
--   2. Validates caller is NOT the creator (no self-approval)
--   3. Locks product rows with advisory lock (prevents double-transfer race)
--   4. Updates transaction status → completed
--   5. Updates product status + location based on transaction_type
--   6. Generates inventory_movements rows
--   7. Returns the updated transaction row
--
-- Raises EXCEPTION on any validation failure — entire transaction rolls back.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION approve_transaction(
  p_transaction_id UUID
)
RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_txn          transactions%ROWTYPE;
  v_item         transaction_items%ROWTYPE;
  v_product      products%ROWTYPE;
  v_caller_id    UUID    := auth.uid();
  v_caller_role  TEXT;
  v_new_status   TEXT;
  v_new_branch   UUID;
  v_new_client   UUID;
  v_result       transactions%ROWTYPE;
BEGIN
  -- ── 1. Validate caller role ─────────────────────────────────────────────
  SELECT role INTO v_caller_role
  FROM admins
  WHERE id = v_caller_id AND deleted_at IS NULL;

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admin or super_admin can approve transactions (role: %)',
      COALESCE(v_caller_role, 'unauthenticated');
  END IF;

  -- ── 2. Lock and load transaction (FOR UPDATE prevents concurrent approvals) ─
  SELECT * INTO v_txn
  FROM transactions
  WHERE transaction_id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found', p_transaction_id;
  END IF;

  -- ── 3. Status must be 'pending' ────────────────────────────────────────
  IF v_txn.status != 'pending' THEN
    RAISE EXCEPTION 'Transaction % cannot be approved — current status is ''%'' (must be ''pending'')',
      p_transaction_id, v_txn.status;
  END IF;

  -- ── 4. Self-approval prevention ────────────────────────────────────────
  IF v_txn.created_by = v_caller_id THEN
    RAISE EXCEPTION 'Self-approval is not allowed. The approver must be different from the transaction creator.';
  END IF;

  -- ── 5. Process each transaction item ───────────────────────────────────
  FOR v_item IN
    SELECT * FROM transaction_items WHERE transaction_id = p_transaction_id
  LOOP
    -- Acquire advisory lock on this product to prevent concurrent modifications
    PERFORM pg_advisory_xact_lock(hashtext('product:' || v_item.product_id::TEXT));

    -- Load current product state
    SELECT * INTO v_product
    FROM products
    WHERE product_id = v_item.product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % (item %) not found', v_item.product_id, v_item.transaction_item_id;
    END IF;

    -- Determine new product state based on transaction_type
    CASE v_txn.transaction_type
      WHEN 'sale' THEN
        -- Validate current product can be sold
        PERFORM validate_product_transition(v_product.status::TEXT, 'sold');
        v_new_status := 'sold';
        v_new_branch := NULL;                         -- sold = no branch
        v_new_client := v_txn.client_id;             -- ownership to client

        -- Generate stock_out movement
        INSERT INTO inventory_movements (
          product_id, branch_id, transaction_id,
          movement_type, quantity_before, quantity_change, quantity_after,
          notes, created_by
        ) VALUES (
          v_item.product_id,
          v_txn.source_branch_id,
          p_transaction_id,
          'stock_out', 1, -1, 0,
          FORMAT('Sale: transaction %s', v_txn.transaction_code),
          v_caller_id
        );

      WHEN 'purchase' THEN
        -- New asset arriving at destination branch
        PERFORM validate_product_transition(v_product.status::TEXT, 'active');
        v_new_status := 'active';
        v_new_branch := v_txn.destination_branch_id;
        v_new_client := NULL;

        -- Generate stock_in movement
        INSERT INTO inventory_movements (
          product_id, branch_id, transaction_id,
          movement_type, quantity_before, quantity_change, quantity_after,
          notes, created_by
        ) VALUES (
          v_item.product_id,
          v_txn.destination_branch_id,
          p_transaction_id,
          'stock_in', 0, 1, 1,
          FORMAT('Purchase: transaction %s', v_txn.transaction_code),
          v_caller_id
        );

      WHEN 'transfer' THEN
        -- Asset moves between branches
        PERFORM validate_product_transition(v_product.status::TEXT, 'deployed');
        v_new_status := 'deployed';
        v_new_branch := v_txn.destination_branch_id;
        v_new_client := v_product.current_client_id;  -- client unchanged on transfer

        -- Generate stock_out from source
        INSERT INTO inventory_movements (
          product_id, branch_id, transaction_id,
          movement_type, quantity_before, quantity_change, quantity_after,
          notes, created_by
        ) VALUES (
          v_item.product_id,
          v_txn.source_branch_id,
          p_transaction_id,
          'stock_out', 1, -1, 0,
          FORMAT('Transfer out: %s → branch %s', v_txn.transaction_code, v_txn.destination_branch_id),
          v_caller_id
        );

        -- Generate stock_in to destination
        INSERT INTO inventory_movements (
          product_id, branch_id, transaction_id,
          movement_type, quantity_before, quantity_change, quantity_after,
          notes, created_by
        ) VALUES (
          v_item.product_id,
          v_txn.destination_branch_id,
          p_transaction_id,
          'stock_in', 0, 1, 1,
          FORMAT('Transfer in: %s ← branch %s', v_txn.transaction_code, v_txn.source_branch_id),
          v_caller_id
        );

      WHEN 'return' THEN
        -- Asset returned from client to branch
        PERFORM validate_product_transition(v_product.status::TEXT, 'active');
        v_new_status := 'active';
        v_new_branch := v_txn.destination_branch_id;
        v_new_client := NULL;  -- client ownership cleared on return

        -- Generate stock_in movement
        INSERT INTO inventory_movements (
          product_id, branch_id, transaction_id,
          movement_type, quantity_before, quantity_change, quantity_after,
          notes, created_by
        ) VALUES (
          v_item.product_id,
          v_txn.destination_branch_id,
          p_transaction_id,
          'return', 0, 1, 1,
          FORMAT('Return: transaction %s', v_txn.transaction_code),
          v_caller_id
        );

      ELSE
        RAISE EXCEPTION 'Unknown transaction_type: %', v_txn.transaction_type;
    END CASE;

    -- Update product state
    UPDATE products SET
      status             = v_new_status,
      current_branch_id  = v_new_branch,
      current_client_id  = v_new_client,
      updated_at         = NOW()
    WHERE product_id = v_item.product_id;

  END LOOP;

  -- ── 6. Mark transaction as completed ───────────────────────────────────
  UPDATE transactions SET
    status      = 'completed',
    approved_by = v_caller_id,
    approved_at = NOW(),
    updated_at  = NOW()
  WHERE transaction_id = p_transaction_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION approve_transaction(UUID) IS
  'Atomically approves a pending transaction. Validates admin role, prevents self-approval, '
  'acquires advisory locks on products, generates inventory movements, updates product state. '
  'Raises EXCEPTION on any violation — full rollback guaranteed.';

-- ── 4. cancel_transaction() ───────────────────────────────────────────────────
-- Cancels a draft or pending transaction.
-- Rules:
--   - draft:   creator OR admin/super_admin can cancel
--   - pending: admin/super_admin only (warehouse cannot cancel pending)
--   - completed/cancelled: cannot cancel
-- No inventory movements generated — asset state unchanged.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cancel_transaction(
  p_transaction_id UUID,
  p_reason         TEXT DEFAULT NULL
)
RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_txn          transactions%ROWTYPE;
  v_caller_id    UUID := auth.uid();
  v_caller_role  TEXT;
  v_result       transactions%ROWTYPE;
BEGIN
  -- ── 1. Load caller role ─────────────────────────────────────────────────
  SELECT role INTO v_caller_role
  FROM admins
  WHERE id = v_caller_id AND deleted_at IS NULL;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Only authenticated admin users can cancel transactions';
  END IF;

  -- ── 2. Lock and load transaction ────────────────────────────────────────
  SELECT * INTO v_txn
  FROM transactions
  WHERE transaction_id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found', p_transaction_id;
  END IF;

  -- ── 3. Status validation ────────────────────────────────────────────────
  IF v_txn.status NOT IN ('draft', 'pending') THEN
    RAISE EXCEPTION 'Transaction % cannot be cancelled — status is ''%''',
      p_transaction_id, v_txn.status;
  END IF;

  -- ── 4. Role-based permission ────────────────────────────────────────────
  IF v_txn.status = 'pending' AND v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admin or super_admin can cancel pending transactions (your role: %)', v_caller_role;
  END IF;

  -- For draft: allow creator OR admin/super_admin
  IF v_txn.status = 'draft'
    AND v_txn.created_by != v_caller_id
    AND v_caller_role NOT IN ('admin', 'super_admin')
  THEN
    RAISE EXCEPTION 'You can only cancel your own draft transactions';
  END IF;

  -- ── 5. Cancel ───────────────────────────────────────────────────────────
  UPDATE transactions SET
    status      = 'cancelled',
    approved_by = v_caller_id,
    approved_at = NOW(),
    notes       = CASE
                    WHEN p_reason IS NOT NULL
                    THEN COALESCE(notes || E'\n', '') || 'Cancelled: ' || p_reason
                    ELSE notes
                  END,
    updated_at  = NOW()
  WHERE transaction_id = p_transaction_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION cancel_transaction(UUID, TEXT) IS
  'Cancels a draft or pending transaction. Warehouse can cancel own drafts; '
  'admin/super_admin can cancel any draft or pending. No asset state changes.';

-- ── Grant RPC access to authenticated role ────────────────────────────────────
GRANT EXECUTE ON FUNCTION generate_transaction_code()              TO authenticated;
GRANT EXECUTE ON FUNCTION validate_product_transition(TEXT, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION approve_transaction(UUID)                TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_transaction(UUID, TEXT)           TO authenticated;

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT generate_transaction_code();
-- → TRX-20260609-0001
--
-- SELECT approve_transaction('00000000-0000-0000-0000-000000000000');
-- → ERROR: Transaction ... not found
--
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
--   AND routine_name IN ('generate_transaction_code','approve_transaction','cancel_transaction','validate_product_transition');
-- → 4 rows expected
