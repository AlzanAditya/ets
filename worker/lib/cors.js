// ============================================================
// lib/cors.js — CORS headers and preflight handler
// ============================================================

export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function handleCors() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}
