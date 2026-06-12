// ============================================================
// lib/supabase.js — Supabase REST API helper
// ============================================================

/**
 * Perform an authenticated request against Supabase REST API.
 *
 * @param {object}  env          Worker environment bindings
 * @param {string}  path         PostgREST path (e.g. '/products?id=eq.1')
 * @param {object}  options      fetch() options (method, body, headers…)
 * @param {boolean} useService   When true, use the service_role key (bypasses RLS)
 */
export async function sb(env, path, options = {}, useService = false) {
    const key = useService ? env.SUPABASE_SERVICE_KEY : env.SUPABASE_ANON_KEY;
    return fetch(`${env.SUPABASE_URL}/rest/v1${path}`, {
        ...options,
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
            ...(options.headers || {}),
        },
    });
}
