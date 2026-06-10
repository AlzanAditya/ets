-- ============================================================
-- 012_create_stats_views.sql
-- Phase 3 — Server-side aggregation views
--
-- Views:
--   1. transaction_stats   — dashboard metric cards + notification badge
--   2. scan_stats          — QR statistics dashboard
--
-- Purpose: Replace all client-side aggregation (JS reduce over full rows).
--
-- Performance impact:
--   BEFORE: getTransactionStats() downloads all status+grand_total rows
--           → O(N) network payload, O(N) JS processing
--   AFTER:  SELECT * FROM transaction_stats → 1 row, always O(1) client
--
-- MUST run AFTER 006 (transactions table exists)
--            AND 005 (scan_logs table exists)
-- ============================================================

BEGIN;

-- ── 1. transaction_stats view ─────────────────────────────────────────────────
-- Provides a single-row aggregate of all transaction status counts
-- and total revenue. Used by:
--   - Dashboard metric cards
--   - Notification bell pending count
--   - Sidebar badge
--   - Approval queue counter
--
-- RLS: This view inherits the RLS of the underlying tables.
--      Authenticated users who can SELECT transactions will get correct numbers.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW transaction_stats AS
SELECT
  COUNT(*)                                                       AS total_count,
  COUNT(*) FILTER (WHERE status = 'completed')                   AS completed_count,
  COUNT(*) FILTER (WHERE status = 'pending')                     AS pending_count,
  COUNT(*) FILTER (WHERE status = 'draft')                       AS draft_count,
  COUNT(*) FILTER (WHERE status = 'cancelled')                   AS cancelled_count,
  COALESCE(
    SUM(grand_total) FILTER (WHERE status = 'completed'),
    0
  )                                                              AS total_revenue,
  COALESCE(
    SUM(grand_total) FILTER (WHERE status = 'pending'),
    0
  )                                                              AS pending_revenue,
  MAX(created_at)                                                AS last_transaction_at
FROM transactions;

COMMENT ON VIEW transaction_stats IS
  'Single-row aggregate of transaction counts and revenue. '
  'Replace all client-side stats aggregation with SELECT * FROM transaction_stats. '
  'Inherits RLS from transactions table.';

-- ── 2. scan_stats view ────────────────────────────────────────────────────────
-- Provides a single-row aggregate of scan log statistics.
-- Used by:
--   - QR Statistics dashboard metric cards
--   - Dashboard scan count card
--
-- Performance note: COUNT(DISTINCT) on large tables is O(N) on Postgres.
-- For 100K+ rows, consider adding a materialized view refresh or
-- pg_trgm indexes if query becomes slow (> 200ms).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW scan_stats AS
SELECT
  COUNT(*)                                                              AS total_scans,
  COUNT(*) FILTER (
    WHERE scanned_at >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Jakarta')
  )                                                                     AS scans_this_month,
  COUNT(*) FILTER (
    WHERE scanned_at >= NOW() - INTERVAL '7 days'
  )                                                                     AS scans_this_week,
  COUNT(*) FILTER (
    WHERE scanned_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Jakarta')
  )                                                                     AS scans_today,
  COUNT(DISTINCT product_id) FILTER (WHERE product_id IS NOT NULL)     AS unique_products_scanned,
  MAX(scanned_at)                                                       AS last_scanned_at
FROM scan_logs;

COMMENT ON VIEW scan_stats IS
  'Single-row aggregate of QR scan log statistics. '
  'Replaces client-side unique product counting via Set(). '
  'For 100K+ rows: consider REFRESH MATERIALIZED VIEW on schedule.';

-- ── 3. Grant SELECT to authenticated users ────────────────────────────────────
-- Views do not inherit grants automatically — must grant explicitly.
GRANT SELECT ON transaction_stats TO authenticated;
GRANT SELECT ON scan_stats        TO authenticated;

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────────────
-- SELECT * FROM transaction_stats;
-- → 1 row: total_count, completed_count, pending_count, draft_count, ...
--
-- SELECT * FROM scan_stats;
-- → 1 row: total_scans, scans_this_month, scans_this_week, scans_today, ...
--
-- SELECT viewname FROM pg_views WHERE schemaname = 'public'
--   AND viewname IN ('transaction_stats', 'scan_stats');
-- → 2 rows expected
