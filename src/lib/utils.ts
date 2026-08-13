import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export function safeUUID(): string {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID()
  }
  // Fallback UUID v4 generator for non-secure contexts (HTTP/IP environments)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Formats a serial number according to system rules:
 * - No spaces (leading, middle, or trailing)
 * - Only alphanumeric (A-Z, 0-9) and hyphen (-)
 * - All letters automatically uppercase
 */
export function formatSerialNumber(val: string): string {
  if (!val) return ""
  return val
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toUpperCase()
}
