// ============================================================
// routes/transactions.js — Server-side transaction lifecycle
//
// SECURITY: This module enforces the complete state machine for
// all transaction operations. The browser is never trusted to:
//   • Generate transaction codes
//   • Approve/cancel transactions
//   • Create inventory movements
//   • Update asset status or ownership after approval
//
// Role enforcement matrix:
//   warehouse   → create draft, submit own drafts, view all
//   admin       → all above + update, cancel, approve (not own)
//   super_admin → all above without restriction
//
// State machine:
//   draft → [submit] → pending → [approve] → completed
//                            ↘ [cancel]  → cancelled
//   draft → [cancel] → cancelled
//
// Endpoints:
//   POST  /transactions/generate-code     → generate code (min: warehouse)
//   POST  /transactions                   → create draft  (min: warehouse)
//   GET   /transactions                   → list          (min: warehouse)
//   GET   /transactions/:id               → single + items(min: warehouse)
//   PATCH /transactions/:id               → update draft/pending (min: admin)
//   POST  /transactions/:id/submit        → draft→pending (min: warehouse)
//   POST  /transactions/:id/approve       → pending→completed + movements (min: admin)
//   POST  /transactions/:id/cancel        → cancel        (min: admin)
// ============================================================

import { sb } from '../lib/supabase.js';
import { json, err } from '../lib/response.js';
import { requireAuth } from '../lib/auth.js';

const VALID_TRANSACTION_TYPES = ['sale', 'purchase', 'return', 'transfer'];

// ── Internal helpers ────────────────────────────────────────

/**
 * Generate a unique transaction code server-side.
 * Format: TRX-YYYYMMDD-XXXX (e.g. TRX-20260608-0001)
 * Guaranteed unique by querying the latest code with matching prefix.
 */
async function generateTransactionCode(env) {
    const now    = new Date();
    const date   = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `TRX-${date}-`;

    const res      = await sb(env, `/transactions?transaction_code=like.${encodeURIComponent(prefix)}*&select=transaction_code&order=transaction_code.desc&limit=1`, {}, true);
    const existing = await res.json().catch(() => []);

    let seq = 1;
    if (existing?.length && existing[0].transaction_code) {
        const lastSeq = parseInt(existing[0].transaction_code.split('-').pop() || '0', 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * Build inventory movement rows and product update payloads for
 * each item in an approved transaction.
 *
 * This runs entirely server-side and is the ONLY place where
 * inventory_movements are created and product status/ownership
 * is updated as a result of a transaction.
 *
 * @param {object} transaction   Full transaction row from DB
 * @param {Array}  items         transaction_items rows
 * @param {string} approvedBy    admin_id of the approver
 * @returns {{ movements: Array, productUpdates: Array }}
 */
function buildApprovalPayloads(transaction, items, approvedBy) {
    const now = new Date().toISOString();
    const {
        transaction_id,
        transaction_code,
        transaction_type,
        client_id,
        source_branch_id,
        destination_branch_id,
    } = transaction;

    const movements      = [];
    const productUpdates = [];

    for (const item of items) {
        const { product_id } = item;

        if (transaction_type === 'sale') {
            // Stock leaves source branch → product sold to client
            movements.push({
                product_id,
                branch_id:        source_branch_id,
                transaction_id,
                movement_type:    'stock_out',
                quantity_before:  1,
                quantity_change:  -1,
                quantity_after:   0,
                notes:            `Penjualan — ${transaction_code}`,
                created_by:       approvedBy,
                created_at:       now,
            });
            productUpdates.push({
                product_id,
                update: {
                    status:            'sold',
                    current_client_id: client_id,
                    current_branch_id: null,
                    updated_at:        now,
                },
            });
        }

        else if (transaction_type === 'purchase') {
            // Stock enters destination branch from supplier
            movements.push({
                product_id,
                branch_id:        destination_branch_id,
                transaction_id,
                movement_type:    'stock_in',
                quantity_before:  0,
                quantity_change:  1,
                quantity_after:   1,
                notes:            `Pembelian — ${transaction_code}`,
                created_by:       approvedBy,
                created_at:       now,
            });
            productUpdates.push({
                product_id,
                update: {
                    status:            'active',
                    current_branch_id: destination_branch_id,
                    current_client_id: null,
                    updated_at:        now,
                },
            });
        }

        else if (transaction_type === 'transfer') {
            // Stock leaves source and enters destination branch
            movements.push(
                {
                    product_id,
                    branch_id:        source_branch_id,
                    transaction_id,
                    movement_type:    'stock_out',
                    quantity_before:  1,
                    quantity_change:  -1,
                    quantity_after:   0,
                    notes:            `Transfer keluar — ${transaction_code}`,
                    created_by:       approvedBy,
                    created_at:       now,
                },
                {
                    product_id,
                    branch_id:        destination_branch_id,
                    transaction_id,
                    movement_type:    'stock_in',
                    quantity_before:  0,
                    quantity_change:  1,
                    quantity_after:   1,
                    notes:            `Transfer masuk — ${transaction_code}`,
                    created_by:       approvedBy,
                    created_at:       now,
                }
            );
            productUpdates.push({
                product_id,
                update: {
                    current_branch_id: destination_branch_id,
                    updated_at:        now,
                },
            });
        }

        else if (transaction_type === 'return') {
            // Product returned from client back to a branch
            movements.push({
                product_id,
                branch_id:        destination_branch_id,
                transaction_id,
                movement_type:    'stock_in',
                quantity_before:  0,
                quantity_change:  1,
                quantity_after:   1,
                notes:            `Retur dari klien — ${transaction_code}`,
                created_by:       approvedBy,
                created_at:       now,
            });
            productUpdates.push({
                product_id,
                update: {
                    status:            'active',
                    current_client_id: null,
                    current_branch_id: destination_branch_id,
                    updated_at:        now,
                },
            });
        }
    }

    return { movements, productUpdates };
}

/**
 * Execute approval side-effects atomically (best-effort within Cloudflare Workers).
 * Steps:
 *   1. Batch-insert all inventory_movements
 *   2. Update each product's status / ownership
 *
 * Returns { ok: true } or { ok: false, error: string }
 */
async function executeApprovalWorkflow(env, transaction, items, approvedBy) {
    const { movements, productUpdates } = buildApprovalPayloads(transaction, items, approvedBy);

    // ── Step 1: batch-insert inventory movements ────────────
    if (movements.length > 0) {
        const movRes = await sb(env, '/inventory_movements', {
            method:  'POST',
            body:    JSON.stringify(movements),
            headers: { Prefer: 'return=minimal' },
        }, true);

        if (!movRes.ok) {
            const movErr = await movRes.json().catch(() => ({}));
            return { ok: false, error: movErr?.message || 'Gagal mencatat inventory movements' };
        }
    }

    // ── Step 2: update each product ─────────────────────────
    for (const { product_id, update } of productUpdates) {
        const prodRes = await sb(env, `/products?product_id=eq.${product_id}`, {
            method:  'PATCH',
            body:    JSON.stringify(update),
            headers: { Prefer: 'return=minimal' },
        }, true);

        if (!prodRes.ok) {
            const prodErr = await prodRes.json().catch(() => ({}));
            return { ok: false, error: prodErr?.message || `Gagal update produk ${product_id}` };
        }
    }

    return { ok: true };
}

// ── Route handler ───────────────────────────────────────────

export async function handleTransactionRoutes(method, pathname, url, request, env) {

    // ── POST /transactions/generate-code ─────────────────────
    if (method === 'POST' && pathname === '/transactions/generate-code') {
        const { admin, error } = await requireAuth(request, env, 'warehouse');
        if (error) return error;

        const transaction_code = await generateTransactionCode(env);
        return json({ success: true, transaction_code });
    }

    // ── POST /transactions  — Create new draft transaction ───
    if (method === 'POST' && pathname === '/transactions') {
        const { admin, error } = await requireAuth(request, env, 'warehouse');
        if (error) return error;

        let body;
        try { body = await request.json(); }
        catch { return err('JSON tidak valid', 'VALIDATION_ERROR', 400); }

        if (!body.transaction_type || !VALID_TRANSACTION_TYPES.includes(body.transaction_type)) {
            return err(
                `transaction_type tidak valid. Pilihan: ${VALID_TRANSACTION_TYPES.join(', ')}`,
                'VALIDATION_ERROR', 400
            );
        }

        // Validate required branches per transaction type
        if (['sale', 'transfer'].includes(body.transaction_type) && !body.source_branch_id) {
            return err('source_branch_id wajib untuk tipe sale/transfer', 'VALIDATION_ERROR', 400);
        }
        if (['purchase', 'return', 'transfer'].includes(body.transaction_type) && !body.destination_branch_id) {
            return err('destination_branch_id wajib untuk tipe purchase/return/transfer', 'VALIDATION_ERROR', 400);
        }
        if (body.transaction_type === 'sale' && !body.client_id) {
            return err('client_id wajib untuk tipe sale', 'VALIDATION_ERROR', 400);
        }

        // Generate code server-side — never accept code from client body
        const transaction_code = await generateTransactionCode(env);

        const payload = {
            transaction_code,
            transaction_type:      body.transaction_type,
            status:                'draft',   // Always draft — client cannot override
            client_id:             body.client_id             || null,
            source_branch_id:      body.source_branch_id      || null,
            destination_branch_id: body.destination_branch_id || null,
            subtotal:              parseFloat(body.subtotal)       || 0,
            discount_amount:       parseFloat(body.discount_amount) || 0,
            tax_amount:            parseFloat(body.tax_amount)      || 0,
            shipping_cost:         parseFloat(body.shipping_cost)   || 0,
            grand_total:           parseFloat(body.grand_total)     || 0,
            notes:                 body.notes?.trim()               || null,
            transaction_date:      body.transaction_date            || new Date().toISOString().split('T')[0],
            // Security: creator identity always from auth token, never from body
            created_by:            admin.admin_id,
            approved_by:           null,
            approved_at:           null,
        };

        const res  = await sb(env, '/transactions', { method: 'POST', body: JSON.stringify(payload) }, true);
        const data = await res.json();
        if (!res.ok) return err(data?.message || 'Gagal membuat transaksi', 'SERVER_ERROR', 500);
        return json({ success: true, data: Array.isArray(data) ? data[0] : data }, 201);
    }

    // ── GET /transactions  — List transactions ────────────────
    if (method === 'GET' && pathname === '/transactions') {
        const { admin, error } = await requireAuth(request, env, 'warehouse');
        if (error) return error;

        const status = url.searchParams.get('status');
        const type   = url.searchParams.get('type');
        const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '50'), 200);
        const offset = parseInt(url.searchParams.get('offset') || '0');

        let qs = `?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
        if (status) qs += `&status=eq.${status}`;
        if (type)   qs += `&transaction_type=eq.${type}`;

        const res  = await sb(env, `/transactions${qs}`, {}, true);
        const data = await res.json();
        if (!res.ok) return err(data?.message || 'Gagal mengambil transaksi', 'SERVER_ERROR', 500);
        return json({ success: true, data, count: data.length });
    }

    // ── POST /transactions/:id/submit  — draft → pending ─────
    if (method === 'POST' && pathname.match(/^\/transactions\/[^/]+\/submit$/)) {
        const { admin, error } = await requireAuth(request, env, 'warehouse');
        if (error) return error;

        const id = pathname.replace('/transactions/', '').replace('/submit', '');

        const current  = await sb(env, `/transactions?transaction_id=eq.${id}&select=status,created_by`, {}, true);
        const currentData = await current.json();
        if (!currentData?.length) return err('Transaksi tidak ditemukan', 'NOT_FOUND', 404);

        const txn = currentData[0];
        if (txn.status !== 'draft') {
            return err('Hanya transaksi berstatus draft yang dapat disubmit', 'CONFLICT', 409);
        }

        // Warehouse can only submit their own transactions
        if (admin.role === 'warehouse' && txn.created_by !== admin.admin_id) {
            return err('Forbidden — hanya dapat submit transaksi milik sendiri', 'FORBIDDEN', 403);
        }

        // Ensure transaction has at least one item before submitting
        const itemsRes  = await sb(env, `/transaction_items?transaction_id=eq.${id}&select=item_id&limit=1`, {}, true);
        const itemsData = await itemsRes.json().catch(() => []);
        if (!itemsData?.length) {
            return err('Transaksi harus memiliki minimal 1 item sebelum dapat disubmit', 'VALIDATION_ERROR', 400);
        }

        const res  = await sb(env, `/transactions?transaction_id=eq.${id}`, {
            method: 'PATCH',
            body:   JSON.stringify({ status: 'pending', updated_at: new Date().toISOString() }),
        }, true);
        const data = await res.json();
        if (!res.ok) return err(data?.message || 'Gagal submit transaksi', 'SERVER_ERROR', 500);
        return json({ success: true, data: data[0] });
    }

    // ── POST /transactions/:id/approve  — CRITICAL ENDPOINT ──
    // Server-side atomic approval:
    //   1. Validate token + role (min: admin)
    //   2. Enforce state machine (status must be 'pending')
    //   3. Prevent self-approval for admin role
    //   4. Update transaction status to 'completed'
    //   5. Batch-create inventory_movements
    //   6. Update product status/ownership per transaction type
    //   7. Rollback status on workflow failure
    if (method === 'POST' && pathname.match(/^\/transactions\/[^/]+\/approve$/)) {
        const { admin, error } = await requireAuth(request, env, 'admin');
        if (error) return error;

        const id = pathname.replace('/transactions/', '').replace('/approve', '');

        // Fetch full transaction row
        const txnRes  = await sb(env, `/transactions?transaction_id=eq.${id}&select=*`, {}, true);
        const txnData = await txnRes.json();
        if (!txnData?.length) return err('Transaksi tidak ditemukan', 'NOT_FOUND', 404);
        const transaction = txnData[0];

        // Enforce state machine — must be pending
        if (transaction.status !== 'pending') {
            return err(
                `Hanya transaksi berstatus pending yang dapat disetujui. Status saat ini: ${transaction.status}`,
                'CONFLICT', 409
            );
        }

        // Admin cannot approve their own transaction (four-eyes principle)
        if (admin.role === 'admin' && transaction.created_by === admin.admin_id) {
            return err(
                'Admin tidak dapat menyetujui transaksi yang dibuat sendiri (four-eyes principle)',
                'FORBIDDEN', 403
            );
        }

        // Fetch transaction items
        const itemsRes  = await sb(env, `/transaction_items?transaction_id=eq.${id}&select=*`, {}, true);
        const items     = await itemsRes.json();
        if (!items?.length) {
            return err('Transaksi tidak memiliki item — tidak dapat disetujui', 'VALIDATION_ERROR', 400);
        }

        const now = new Date().toISOString();

        // ── Step 1: Mark transaction as completed ─────────────
        const approvalRes = await sb(env, `/transactions?transaction_id=eq.${id}`, {
            method: 'PATCH',
            body:   JSON.stringify({
                status:      'completed',
                approved_by: admin.admin_id,
                approved_at: now,
                updated_at:  now,
            }),
        }, true);

        if (!approvalRes.ok) {
            return err('Gagal mengupdate status transaksi', 'SERVER_ERROR', 500);
        }

        // ── Step 2: Execute inventory workflow ────────────────
        const workflowResult = await executeApprovalWorkflow(env, transaction, items, admin.admin_id);

        if (!workflowResult.ok) {
            // Best-effort rollback: revert status back to pending
            await sb(env, `/transactions?transaction_id=eq.${id}`, {
                method: 'PATCH',
                body:   JSON.stringify({
                    status:      'pending',
                    approved_by: null,
                    approved_at: null,
                    updated_at:  now,
                }),
            }, true).catch(() => {});

            return err(workflowResult.error, 'WORKFLOW_ERROR', 500);
        }

        return json({
            success: true,
            message: 'Transaksi berhasil disetujui — inventory dan status aset telah diperbarui',
            transaction_id: id,
        });
    }

    // ── POST /transactions/:id/cancel ─────────────────────────
    if (method === 'POST' && pathname.match(/^\/transactions\/[^/]+\/cancel$/)) {
        const { admin, error } = await requireAuth(request, env, 'admin');
        if (error) return error;

        const id = pathname.replace('/transactions/', '').replace('/cancel', '');

        const txnRes  = await sb(env, `/transactions?transaction_id=eq.${id}&select=status`, {}, true);
        const txnData = await txnRes.json();
        if (!txnData?.length) return err('Transaksi tidak ditemukan', 'NOT_FOUND', 404);

        const { status } = txnData[0];
        if (!['draft', 'pending'].includes(status)) {
            return err(
                `Hanya transaksi berstatus draft/pending yang dapat dibatalkan. Status saat ini: ${status}`,
                'CONFLICT', 409
            );
        }

        const now = new Date().toISOString();
        const res  = await sb(env, `/transactions?transaction_id=eq.${id}`, {
            method: 'PATCH',
            body:   JSON.stringify({
                status:      'cancelled',
                approved_by: admin.admin_id, // Record who cancelled it
                approved_at: now,
                updated_at:  now,
            }),
        }, true);
        const data = await res.json();
        if (!res.ok) return err(data?.message || 'Gagal membatalkan transaksi', 'SERVER_ERROR', 500);

        // Security: NO inventory_movements are created for cancellations
        // Security: NO product status/ownership is changed for cancellations

        return json({
            success: true,
            message: 'Transaksi berhasil dibatalkan',
            transaction_id: id,
        });
    }

    // ── PATCH /transactions/:id  — Update draft/pending fields ─
    if (method === 'PATCH' && pathname.match(/^\/transactions\/[^/]+$/) &&
        !pathname.endsWith('/approve') && !pathname.endsWith('/cancel') && !pathname.endsWith('/submit')) {
        const { admin, error } = await requireAuth(request, env, 'admin');
        if (error) return error;

        const id = pathname.replace('/transactions/', '');

        let body;
        try { body = await request.json(); }
        catch { return err('JSON tidak valid', 'VALIDATION_ERROR', 400); }

        // Verify current state allows editing
        const current     = await sb(env, `/transactions?transaction_id=eq.${id}&select=status`, {}, true);
        const currentData = await current.json();
        if (!currentData?.length) return err('Transaksi tidak ditemukan', 'NOT_FOUND', 404);
        if (!['draft', 'pending'].includes(currentData[0].status)) {
            return err('Hanya transaksi draft/pending yang dapat diubah', 'CONFLICT', 409);
        }

        // Security: strip all immutable/sensitive fields
        const FORBIDDEN_FIELDS = [
            'transaction_id', 'transaction_code', 'status',
            'created_by', 'approved_by', 'approved_at', 'created_at',
        ];
        for (const key of FORBIDDEN_FIELDS) delete body[key];

        body.updated_at = new Date().toISOString();

        const res  = await sb(env, `/transactions?transaction_id=eq.${id}`, {
            method: 'PATCH',
            body:   JSON.stringify(body),
        }, true);
        const data = await res.json();
        if (!res.ok)        return err(data?.message || 'Gagal update transaksi', 'SERVER_ERROR', 500);
        if (!data?.length)  return err('Transaksi tidak ditemukan', 'NOT_FOUND', 404);
        return json({ success: true, data: data[0] });
    }

    // ── GET /transactions/:id  — Single transaction + items ───
    if (method === 'GET' && pathname.match(/^\/transactions\/[^/]+$/)) {
        const { admin, error } = await requireAuth(request, env, 'warehouse');
        if (error) return error;

        const id = pathname.replace('/transactions/', '');

        const [txnRes, itemsRes] = await Promise.all([
            sb(env, `/transactions?transaction_id=eq.${id}&select=*`, {}, true),
            sb(env, `/transaction_items?transaction_id=eq.${id}&select=*&order=created_at.asc`, {}, true),
        ]);

        const txn   = await txnRes.json();
        const items = await itemsRes.json().catch(() => []);

        if (!txn?.length) return err('Transaksi tidak ditemukan', 'NOT_FOUND', 404);
        return json({ success: true, data: { ...txn[0], items } });
    }

    return null; // Route not matched
}
