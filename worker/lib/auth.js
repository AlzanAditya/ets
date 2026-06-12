// ============================================================
// lib/auth.js — Server-side token validation & role enforcement
//
// SECURITY: The browser is treated as an untrusted environment.
// All authorization decisions are made here, server-side only.
// Client-supplied role claims are NEVER trusted.
// ============================================================

import { sb } from './supabase.js';
import { err } from './response.js';

/**
 * Validate a Bearer JWT against Supabase Auth and verify the caller
 * is an active, non-deleted admin with a role in the admins table.
 *
 * Returns { user, role, admin_id } on success, or null on failure.
 *
 * @param {Request} request
 * @param {object}  env
 * @returns {Promise<{ user: object, role: string, admin_id: string }|null>}
 */
export async function validateAdminToken(request, env) {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return null;

    // 1. Verify the JWT with Supabase Auth service
    const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
        },
    });
    if (!userRes.ok) return null;
    const user = await userRes.json();
    if (!user?.id) return null;

    // 2. Cross-reference against admins table using service_role key
    //    This query bypasses RLS and is authoritative.
    const adminRes = await sb(
        env,
        `/admins?id=eq.${user.id}&select=id,role,deleted_at`,
        {},
        true // useService = true → service_role key
    );
    if (!adminRes.ok) return null;
    const admins = await adminRes.json();
    if (!admins?.length) return null;

    // 3. Reject soft-deleted admins
    if (admins[0].deleted_at !== null) return null;

    return {
        user,
        role: admins[0].role,
        admin_id: admins[0].id,
    };
}

// Role hierarchy — higher number = more permissions
const ROLE_LEVELS = {
    super_admin: 3,
    admin: 2,
    warehouse: 1,
};

/**
 * Check whether an authenticated admin has at least the required role level.
 *
 * @param {{ role: string }|null} admin
 * @param {string} minimumRole
 */
export function hasRole(admin, minimumRole) {
    if (!admin) return false;
    return (ROLE_LEVELS[admin.role] ?? 0) >= (ROLE_LEVELS[minimumRole] ?? 0);
}

/**
 * Middleware-style helper: validates the token AND enforces a minimum role.
 *
 * Usage:
 *   const { admin, error } = await requireAuth(request, env, 'admin');
 *   if (error) return error;
 *
 * @param {Request} request
 * @param {object}  env
 * @param {string}  minimumRole  'warehouse' | 'admin' | 'super_admin'
 * @returns {Promise<{ admin: object, error: undefined } | { admin: undefined, error: Response }>}
 */
export async function requireAuth(request, env, minimumRole = 'warehouse') {
    const admin = await validateAdminToken(request, env);

    if (!admin) {
        return { error: err('Unauthorized — token tidak valid atau kedaluwarsa', 'UNAUTHORIZED', 401) };
    }

    if (!hasRole(admin, minimumRole)) {
        return {
            error: err(
                `Forbidden — diperlukan role '${minimumRole}', Anda memiliki role '${admin.role}'`,
                'FORBIDDEN',
                403
            ),
        };
    }

    return { admin };
}
