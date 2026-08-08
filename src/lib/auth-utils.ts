/**
 * Helper utilities for authentication redirect management and return URL safety.
 */

const RETURN_URL_KEY = "ets_return_url"

/**
 * Validates whether a URL is a safe internal return destination
 * to prevent Open Redirect vulnerabilities.
 */
export function getSafeReturnUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null
  const trimmed = url.trim()

  // Must start with '/'
  if (!trimmed.startsWith("/")) return null

  // Reject protocol-relative URLs (e.g. '//evil.com') or backslash tricks ('/\\evil.com')
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return null

  // Reject full URLs with schemes (e.g. 'http:', 'https:', 'javascript:', 'data:')
  if (
    trimmed.includes("://") ||
    trimmed.toLowerCase().startsWith("javascript:") ||
    trimmed.toLowerCase().startsWith("data:")
  ) {
    return null
  }

  // Avoid redirect loops back to login
  if (
    trimmed === "/login" ||
    trimmed.startsWith("/login?") ||
    trimmed.startsWith("/login/")
  ) {
    return null
  }

  return trimmed
}

/**
 * Saves intended return URL in sessionStorage if it is safe and not login page.
 */
export function saveReturnUrl(url: string): void {
  const safe = getSafeReturnUrl(url)
  if (safe) {
    try {
      sessionStorage.setItem(RETURN_URL_KEY, safe)
    } catch {
      // Ignore storage errors (e.g. privacy mode)
    }
  }
}

/**
 * Retrieves the stored return URL from sessionStorage if valid.
 */
export function getStoredReturnUrl(): string | null {
  try {
    const stored = sessionStorage.getItem(RETURN_URL_KEY)
    return getSafeReturnUrl(stored)
  } catch {
    return null
  }
}

/**
 * Removes stored return URL from sessionStorage.
 */
export function clearStoredReturnUrl(): void {
  try {
    sessionStorage.removeItem(RETURN_URL_KEY)
  } catch {
    // Ignore storage errors
  }
}
