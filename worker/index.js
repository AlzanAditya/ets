// ============================================================
// index.js — ETS QR Cloudflare Worker v3.0 (Modular)
//
// Architecture:
//   lib/cors.js          → CORS headers
//   lib/response.js      → json() / err() helpers
//   lib/supabase.js      → Supabase REST fetch wrapper
//   lib/auth.js          → validateAdminToken, requireAuth, hasRole
//   routes/public.js     → Unauthenticated public endpoints
//   routes/products.js   → Product CRUD + status/ownership mutations
//   routes/transactions.js → Full transaction lifecycle + approval workflow
//   routes/analytics.js  → Analytics & scan statistics
//
// Security model:
//   • The browser is treated as an untrusted environment.
//   • All sensitive operations are enforced server-side in this worker.
//   • Client-supplied role claims are never trusted.
//   • Token validation and role checks happen in lib/auth.js.
//
// Env secrets required:
//   SUPABASE_URL        (var in wrangler.toml)
//   SUPABASE_ANON_KEY   (wrangler secret put SUPABASE_ANON_KEY)
//   SUPABASE_SERVICE_KEY(wrangler secret put SUPABASE_SERVICE_KEY)
// ============================================================

import { handleCors } from './lib/cors.js';
import { err } from './lib/response.js';

import { handlePublicRoutes }      from './routes/public.js';
import { handleProductRoutes }     from './routes/products.js';
import { handleTransactionRoutes } from './routes/transactions.js';
import { handleAnalyticsRoutes }   from './routes/analytics.js';

export default {
    async fetch(request, env, ctx) {
        const url      = new URL(request.url);
        const pathname = url.pathname;
        const method   = request.method;

        // Handle CORS preflight for all routes
        if (method === 'OPTIONS') return handleCors();

        try {
            // ── 1. Public routes (no auth) ────────────────────────
            const publicRes = await handlePublicRoutes(method, pathname, url, request, env, ctx);
            if (publicRes) return publicRes;

            // ── 2. Transaction routes (auth required) ─────────────
            //    Checked before products to avoid /transactions/* being
            //    mismatched by the generic /products/* handlers
            const txnRes = await handleTransactionRoutes(method, pathname, url, request, env);
            if (txnRes) return txnRes;

            // ── 3. Product admin routes (auth required) ───────────
            const productRes = await handleProductRoutes(method, pathname, url, request, env);
            if (productRes) return productRes;

            // ── 4. Analytics routes (auth required) ───────────────
            const analyticsRes = await handleAnalyticsRoutes(method, pathname, url, request, env);
            if (analyticsRes) return analyticsRes;

            // ── 5. Nothing matched ────────────────────────────────
            return err('Not Found', 'NOT_FOUND', 404);

        } catch (e) {
            console.error('[qr-worker] Unhandled error:', e?.message ?? e);
            return err('Internal server error', 'SERVER_ERROR', 500);
        }
    },
};