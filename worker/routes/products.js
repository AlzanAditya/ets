// ============================================================
// routes/products.js — Authenticated product management
//
// SECURITY: All write/mutate operations are server-side gated.
// Status & ownership changes use dedicated endpoints to prevent
// mass-assignment attacks.
//
// Endpoints:
//   POST  /products                      → create (min: admin)
//   POST  /products/generate-code        → generate unique code (min: admin)
//   GET   /products/admin                → admin list with all fields (min: warehouse)
//   PATCH /products/:nomor_seri          → update metadata only (min: admin)
//   PATCH /products/:nomor_seri/status   → change asset status (min: admin)
//   PATCH /products/:nomor_seri/ownership→ change branch/client (min: admin)
//   DELETE /products/:nomor_seri         → soft-retire (min: super_admin)
// ============================================================

import { sb } from '../lib/supabase.js';
import { json, err } from '../lib/response.js';
import { requireAuth } from '../lib/auth.js';

// Valid asset status values — defined server-side, not by client
const VALID_STATUSES = ['active', 'deployed', 'sold', 'maintenance', 'inactive', 'retired'];

export async function handleProductRoutes(method, pathname, url, request, env) {

    // ── POST /products/generate-code  — Server-side code generation ──
    // Must be checked BEFORE the generic POST /products handler
    if (method === 'POST' && pathname === '/products/generate-code') {
        const { admin, error } = await requireAuth(request, env, 'admin');
        if (error) return error;

        const now    = new Date();
        const year   = now.getFullYear().toString().slice(-2);
        const month  = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `PRD-${year}${month}-`;

        const res      = await sb(env, `/products?product_code=like.${encodeURIComponent(prefix)}*&select=product_code&order=product_code.desc&limit=1`, {}, true);
        const existing = await res.json().catch(() => []);

        let seq = 1;
        if (existing?.length && existing[0].product_code) {
            const lastSeq = parseInt(existing[0].product_code.split('-').pop() || '0', 10);
            if (!isNaN(lastSeq)) seq = lastSeq + 1;
        }

        const product_code = `${prefix}${String(seq).padStart(4, '0')}`;
        return json({ success: true, product_code });
    }

    // ── POST /products  — Create new product ─────────────────────────
    if (method === 'POST' && pathname === '/products') {
        const { admin, error } = await requireAuth(request, env, 'admin');
        if (error) return error;

        let body;
        try { body = await request.json(); }
        catch { return err('JSON tidak valid', 'VALIDATION_ERROR', 400); }

        const { nomor_seri, nama_produk } = body;
        if (!nomor_seri?.trim()) return err('nomor_seri wajib diisi', 'VALIDATION_ERROR', 400);
        if (!nama_produk?.trim()) return err('nama_produk wajib diisi', 'VALIDATION_ERROR', 400);

        // Build payload — strip any client-supplied sensitive fields
        const payload = {
            nomor_seri:            nomor_seri.trim(),
            nama_produk:           nama_produk.trim(),
            product_code:          body.product_code?.trim()          || null,
            category:              body.category?.trim()               || null,
            brand:                 body.brand?.trim()                  || null,
            tipe_kode:             body.tipe_kode?.trim()              || null,
            tahun_pembuatan:       body.tahun_pembuatan ? parseInt(body.tahun_pembuatan) : null,
            input:                 body.input?.trim()                  || null,
            output:                body.output?.trim()                 || null,
            frekuensi:             body.frekuensi?.trim()              || null,
            jumlah_socket:         body.jumlah_socket ? parseInt(body.jumlah_socket) : null,
            range_daya:            body.range_daya?.trim()             || null,
            soft_fuse_protection:  body.soft_fuse_protection?.trim()   || null,
            hard_fuse_protection:  body.hard_fuse_protection?.trim()   || null,
            ground_output:         body.ground_output?.trim()          || null,
            tambahan_optional:     body.tambahan_optional?.trim()      || null,
            gambar_depan:          body.gambar_depan                   || null,
            gambar_kanan:          body.gambar_kanan                   || null,
            gambar_kiri:           body.gambar_kiri                    || null,
            gambar_belakang:       body.gambar_belakang                || null,
            current_branch_id:     body.current_branch_id             || null,
            // Security: new products never belong to a client — must go through a sale transaction
            current_client_id:     null,
            // Security: status is always set server-side, never from client body
            status:                'active',
        };

        const res  = await sb(env, '/products', { method: 'POST', body: JSON.stringify(payload) }, true);
        const data = await res.json();
        if (!res.ok) {
            if (res.status === 409 || data?.code === '23505')
                return err('nomor_seri sudah ada', 'CONFLICT', 409);
            return err(data?.message || 'Gagal menyimpan produk', 'SERVER_ERROR', 500);
        }
        return json({ success: true, data: Array.isArray(data) ? data[0] : data }, 201);
    }

    // ── PATCH /products/:nomor_seri/status  — Asset status change ────
    if (method === 'PATCH' && pathname.match(/^\/products\/[^/]+\/status$/)) {
        const { admin, error } = await requireAuth(request, env, 'admin');
        if (error) return error;

        const nomor_seri = decodeURIComponent(
            pathname.replace(/^\/products\//, '').replace(/\/status$/, '')
        );

        let body;
        try { body = await request.json(); }
        catch { return err('JSON tidak valid', 'VALIDATION_ERROR', 400); }

        if (!body.status || !VALID_STATUSES.includes(body.status)) {
            return err(
                `Status tidak valid. Pilihan: ${VALID_STATUSES.join(', ')}`,
                'VALIDATION_ERROR', 400
            );
        }

        // Only super_admin can retire an asset permanently
        if (body.status === 'retired' && admin.role !== 'super_admin') {
            return err('Hanya super_admin yang dapat meretire aset', 'FORBIDDEN', 403);
        }

        const updatePayload = {
            status:     body.status,
            updated_at: new Date().toISOString(),
        };

        // Retiring clears all location and ownership data
        if (body.status === 'retired') {
            updatePayload.current_branch_id  = null;
            updatePayload.current_client_id  = null;
        }

        const res  = await sb(env, `/products?nomor_seri=eq.${encodeURIComponent(nomor_seri)}`, {
            method: 'PATCH',
            body:   JSON.stringify(updatePayload),
        }, true);
        const data = await res.json();
        if (!res.ok)        return err(data?.message || 'Gagal update status', 'SERVER_ERROR', 500);
        if (!data?.length)  return err('Produk tidak ditemukan', 'NOT_FOUND', 404);
        return json({ success: true, data: data[0] });
    }

    // ── PATCH /products/:nomor_seri/ownership  — Ownership change ────
    if (method === 'PATCH' && pathname.match(/^\/products\/[^/]+\/ownership$/)) {
        const { admin, error } = await requireAuth(request, env, 'admin');
        if (error) return error;

        const nomor_seri = decodeURIComponent(
            pathname.replace(/^\/products\//, '').replace(/\/ownership$/, '')
        );

        let body;
        try { body = await request.json(); }
        catch { return err('JSON tidak valid', 'VALIDATION_ERROR', 400); }

        const updatePayload = { updated_at: new Date().toISOString() };

        if ('current_branch_id' in body) updatePayload.current_branch_id = body.current_branch_id || null;
        if ('current_client_id' in body) updatePayload.current_client_id = body.current_client_id || null;

        // Allow status to be updated together with ownership (e.g. 'deployed' when assigning to client)
        if ('status' in body) {
            const ALLOWED = VALID_STATUSES.filter(s => s !== 'retired');
            if (!ALLOWED.includes(body.status))
                return err(`Status tidak valid. Pilihan: ${ALLOWED.join(', ')}`, 'VALIDATION_ERROR', 400);
            updatePayload.status = body.status;
        }

        const res  = await sb(env, `/products?nomor_seri=eq.${encodeURIComponent(nomor_seri)}`, {
            method: 'PATCH',
            body:   JSON.stringify(updatePayload),
        }, true);
        const data = await res.json();
        if (!res.ok)        return err(data?.message || 'Gagal update kepemilikan', 'SERVER_ERROR', 500);
        if (!data?.length)  return err('Produk tidak ditemukan', 'NOT_FOUND', 404);
        return json({ success: true, data: data[0] });
    }

    // ── PATCH /products/:nomor_seri  — Update metadata only ──────────
    if (method === 'PATCH' && pathname.match(/^\/products\/[^/]+$/) && !pathname.endsWith('/status') && !pathname.endsWith('/ownership')) {
        const { admin, error } = await requireAuth(request, env, 'admin');
        if (error) return error;

        const nomor_seri = decodeURIComponent(pathname.replace('/products/', ''));

        let body;
        try { body = await request.json(); }
        catch { return err('JSON tidak valid', 'VALIDATION_ERROR', 400); }

        // Security: strip all sensitive/immutable fields — use dedicated endpoints for these
        const FORBIDDEN_FIELDS = [
            'nomor_seri', 'product_id', 'created_at',
            'status', 'current_branch_id', 'current_client_id',
        ];
        for (const key of FORBIDDEN_FIELDS) delete body[key];

        // Sanitize all string values
        for (const [k, v] of Object.entries(body)) {
            if (typeof v === 'string') body[k] = v.trim() || null;
        }

        body.updated_at = new Date().toISOString();

        const res  = await sb(env, `/products?nomor_seri=eq.${encodeURIComponent(nomor_seri)}`, {
            method: 'PATCH',
            body:   JSON.stringify(body),
        }, true);
        const data = await res.json();
        if (!res.ok)        return err(data?.message || 'Gagal update produk', 'SERVER_ERROR', 500);
        if (!data?.length)  return err('Produk tidak ditemukan', 'NOT_FOUND', 404);
        return json({ success: true, data: data[0] });
    }

    // ── DELETE /products/:nomor_seri  — Soft-retire (super_admin only) ─
    if (method === 'DELETE' && pathname.match(/^\/products\/[^/]+$/)) {
        const { admin, error } = await requireAuth(request, env, 'super_admin');
        if (error) return error;

        const nomor_seri = decodeURIComponent(pathname.replace('/products/', ''));

        // Soft delete: mark as retired, clear location — never hard-delete
        const res = await sb(env, `/products?nomor_seri=eq.${encodeURIComponent(nomor_seri)}`, {
            method: 'PATCH',
            body:   JSON.stringify({
                status:           'retired',
                current_branch_id: null,
                current_client_id: null,
                updated_at:        new Date().toISOString(),
            }),
        }, true);

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return err(data?.message || 'Gagal meretire produk', 'SERVER_ERROR', 500);
        }
        return json({ success: true });
    }

    return null; // Route not matched
}
