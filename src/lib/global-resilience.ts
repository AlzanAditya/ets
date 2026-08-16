/**
 * Global web lifecycle safeguards.
 *
 * This module only protects against browser-level navigation mistakes that a
 * web page can actually control. It does NOT attempt to block Android/Chrome
 * from suspending or discarding a background tab; that behavior is controlled
 * by the browser/OS and cannot be cancelled by JavaScript.
 */

const APP_RESTORE_KEY = 'app_global_lifecycle_restore_v2'

export function initGlobalWebResilience(): void {
  if (typeof window === 'undefined') return

  // Prevent accidental navigation caused by an unhandled local form submit.
  // Explicit forms with a real action are left untouched.
  window.addEventListener(
    'submit',
    (event: Event) => {
      const form = event.target as HTMLFormElement | null
      if (!form) return

      const action = form.getAttribute('action')
      if (!action || action === '#') {
        event.preventDefault()
      }
    },
    { capture: true }
  )

  // Prevent dropped files from navigating the whole page unless they land in
  // an explicitly declared drop zone.
  window.addEventListener(
    'dragover',
    (event) => {
      event.preventDefault()
    },
    false
  )

  window.addEventListener(
    'drop',
    (event) => {
      const target = event.target as HTMLElement | null
      if (!target?.closest('[data-dropzone], .dropzone')) {
        event.preventDefault()
      }
    },
    false
  )

  // Keep lightweight lifecycle information for diagnostics/recovery. This
  // does not attempt to stop pagehide or unload because doing so is impossible
  // for an OS-discarded mobile tab and can interfere with BFCache.
  window.addEventListener('pagehide', (event: PageTransitionEvent) => {
    try {
      sessionStorage.setItem(
        APP_RESTORE_KEY,
        JSON.stringify({
          path: window.location.pathname + window.location.search + window.location.hash,
          timestamp: Date.now(),
          persisted: event.persisted,
        })
      )
    } catch {
      // Storage can be unavailable in private/restricted browsing contexts.
    }
  })

  window.addEventListener('pageshow', (event: PageTransitionEvent) => {
    if (event.persisted) {
      console.info('[Lifecycle] Page restored from BFCache')
    }
  })
}
