// ============================================================
// routes/public.js — Unauthenticated public endpoints
//
// Endpoints:
//   GET  /p/:id                → pretty-URL redirect
//   GET  /products             → list products (public read)
//   GET  /products/:nomor_seri → get single product + record scan
//   POST /scan                 → explicit scan event recording
//   GET  /qr/check/:nomor_seri → validate a QR code
// ============================================================

import { sb } from '../lib/supabase.js';
import { json, err } from '../lib/response.js';

export async function handlePublicRoutes(method, pathname, url, request, env, ctx) {
    // ── GET /p/:id  — Pretty-URL redirect ─────────────────────
    if (method === 'GET' && (pathname.startsWith('/p/') || pathname.startsWith('/public/p/'))) {
        const id = pathname.split('/p/').pop();
        if (id && id !== 'p') {
            const targetUrl = new URL('/public/product.html', url.origin);
            targetUrl.searchParams.set('id', decodeURIComponent(id).replace(/\/$/, ''));
            return Response.redirect(targetUrl.toString(), 302);
        }
    }

    // ── GET /products  — List products (public, read-only) ─────
    if (method === 'GET' && pathname === '/products') {
        const fields = url.searchParams.get('fields') || '*';
        const search = url.searchParams.get('search') || '';
        const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '50'), 200);
        const offset = parseInt(url.searchParams.get('offset') || '0');

        let qs = `?select=${fields}&order=created_at.desc&limit=${limit}&offset=${offset}`;
        if (search) qs += `&nama_produk=ilike.*${encodeURIComponent(search)}*`;

        const res  = await sb(env, `/products${qs}`);
        const data = await res.json();
        return json({ success: true, data, count: data.length });
    }

    // ── GET /products/:nomor_seri  — Single product + scan log ─
    if (method === 'GET' && pathname.startsWith('/products/')) {
        const nomor_seri = decodeURIComponent(pathname.replace('/products/', ''));
        if (!nomor_seri) return err('nomor_seri diperlukan', 'VALIDATION_ERROR', 400);

        const res  = await sb(env, `/products?nomor_seri=eq.${encodeURIComponent(nomor_seri)}&select=*`);
        const data = await res.json();
        if (!data?.length) return err('Produk tidak ditemukan', 'NOT_FOUND', 404);

        const product = data[0];

        // Fire-and-forget scan log — never fails the response
        ctx.waitUntil(
            sb(env, '/scan_logs', {
                method: 'POST',
                body: JSON.stringify({
                    nomor_seri,
                    product_id:  product.product_id ?? null,
                    user_agent:  request.headers.get('User-Agent')      || null,
                    ip_address:  request.headers.get('CF-Connecting-IP') || null,
                    referer:     request.headers.get('Referer')          || null,
                }),
            }, true).catch(() => {})
        );

        return json({ success: true, data: product });
    }

    // ── POST /scan  — Explicit scan recording ──────────────────
    if (method === 'POST' && pathname === '/scan') {
        let body;
        try { body = await request.json(); }
        catch { return err('JSON tidak valid', 'VALIDATION_ERROR', 400); }

        const { nomor_seri } = body;
        if (!nomor_seri) return err('nomor_seri diperlukan', 'VALIDATION_ERROR', 400);

        // Look up product_id to enrich the log
        const prodRes  = await sb(env, `/products?nomor_seri=eq.${encodeURIComponent(nomor_seri)}&select=product_id`);
        const prodData = await prodRes.json().catch(() => []);
        const product_id = prodData?.[0]?.product_id ?? null;

        await sb(env, '/scan_logs', {
            method: 'POST',
            body: JSON.stringify({
                nomor_seri,
                product_id,
                user_agent:  request.headers.get('User-Agent')      || null,
                ip_address:  request.headers.get('CF-Connecting-IP') || null,
                referer:     request.headers.get('Referer')          || null,
            }),
        }, true).catch(() => {});

        return json({ success: true });
    }

    // ── GET /qr/check/:nomor_seri  — QR validation ─────────────
    if (method === 'GET' && pathname.startsWith('/qr/check/')) {
        const nomor_seri = decodeURIComponent(pathname.replace('/qr/check/', ''));
        const res  = await sb(env, `/products?nomor_seri=eq.${encodeURIComponent(nomor_seri)}&select=nomor_seri,nama_produk,product_id,status`);
        const data = await res.json();
        return json({ success: true, valid: !!data?.length, product: data?.[0] ?? null });
    }

    return null; // Route not matched — fall through to next handler
}
