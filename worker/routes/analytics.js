// ============================================================
// routes/analytics.js — Admin analytics & scan statistics
//
// Endpoints:
//   GET /analytics                → aggregate dashboard stats (min: warehouse)
//   GET /analytics/:nomor_seri   → per-product scan history  (min: warehouse)
// ============================================================

import { sb } from '../lib/supabase.js';
import { json, err } from '../lib/response.js';
import { requireAuth } from '../lib/auth.js';

export async function handleAnalyticsRoutes(method, pathname, url, request, env) {

    // ── GET /analytics  — Aggregate dashboard statistics ─────
    if (method === 'GET' && pathname === '/analytics') {
        const { admin, error } = await requireAuth(request, env, 'warehouse');
        if (error) return error;

        const now        = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        const [totalProd, totalScans, scansToday, topRaw, recentRaw] = await Promise.all([
            // Total product count via content-range header
            sb(env, '/products?select=nomor_seri&limit=1', {
                headers: { Prefer: 'count=exact' },
            }, true).then(r => parseInt(r.headers.get('content-range')?.split('/')[1] || '0')),

            // Total scan count
            sb(env, '/scan_logs?select=id&limit=1', {
                headers: { Prefer: 'count=exact' },
            }, true).then(r => parseInt(r.headers.get('content-range')?.split('/')[1] || '0')),

            // Today's scan count
            sb(env, `/scan_logs?select=id&scanned_at=gte.${todayStart}&limit=1`, {
                headers: { Prefer: 'count=exact' },
            }, true).then(r => parseInt(r.headers.get('content-range')?.split('/')[1] || '0')),

            // All scan logs with product name for aggregation
            sb(env, '/scan_logs?select=nomor_seri,products(nama_produk)&order=nomor_seri.asc', {}, true)
                .then(r => r.json()),

            // 5 most recently added products
            sb(env, '/products?select=nomor_seri,nama_produk,created_at&order=created_at.desc&limit=5', {}, true)
                .then(r => r.json()),
        ]);

        // Aggregate scan counts per product
        const counts = {};
        if (Array.isArray(topRaw)) {
            topRaw.forEach(row => {
                const key = row.nomor_seri;
                if (!counts[key]) {
                    counts[key] = {
                        nomor_seri: key,
                        nama_produk: row.products?.nama_produk || key,
                        scan_count:  0,
                    };
                }
                counts[key].scan_count++;
            });
        }
        const top_products = Object.values(counts)
            .sort((a, b) => b.scan_count - a.scan_count)
            .slice(0, 5);

        return json({
            success: true,
            data: {
                total_products:  totalProd,
                total_scans:     totalScans,
                scans_today:     scansToday,
                top_products,
                recent_products: Array.isArray(recentRaw) ? recentRaw : [],
            },
        });
    }

    // ── GET /analytics/:nomor_seri  — Per-product scan history ─
    if (method === 'GET' && pathname.startsWith('/analytics/')) {
        const { admin, error } = await requireAuth(request, env, 'warehouse');
        if (error) return error;

        const nomor_seri = decodeURIComponent(pathname.replace('/analytics/', ''));
        const res  = await sb(
            env,
            `/scan_logs?nomor_seri=eq.${encodeURIComponent(nomor_seri)}&select=*&order=scanned_at.desc&limit=100`,
            {},
            true
        );
        const data = await res.json();
        return json({ success: true, data, count: data?.length || 0 });
    }

    return null; // Route not matched
}
