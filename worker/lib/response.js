// ============================================================
// lib/response.js — Standardised JSON response helpers
// ============================================================

import { CORS_HEADERS } from './cors.js';

/**
 * Return a JSON response with CORS headers.
 * @param {any} data
 * @param {number} status
 */
export function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
}

/**
 * Return a standardised error JSON response.
 * @param {string} message  Human-readable error
 * @param {string} code     Machine-readable error code
 * @param {number} status   HTTP status code
 */
export function err(message, code = 'SERVER_ERROR', status = 500) {
    return json({ success: false, error: message, code }, status);
}
