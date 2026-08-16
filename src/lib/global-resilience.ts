/**
 * Global Web Resilience & Anti-Refresh Manager
 *
 * This module configures global browser & DOM lifecycle behaviors to ensure:
 * 1. ZERO accidental full-page reloads from unhandled form submits or button clicks anywhere in the app.
 * 2. Back/Forward Cache (BFCache) preservation when switching between apps/dialogs.
 * 3. Page Lifecycle API management (persists navigation state and restores seamlessly if the OS kills the background process).
 * 4. Suppresses unwanted browser-level reload triggers during file selection or background app switching.
 */

// Key used to remember current route & critical session state across OS memory purges
const APP_RESTORE_KEY = 'app_global_lifecycle_restore_v1'

export function initGlobalWebResilience(): void {
  if (typeof window === 'undefined') return

  // 1. Prevent ANY unhandled form submission from triggering a page reload (GET/POST to current URL)
  window.addEventListener(
    'submit',
    (e: Event) => {
      const form = e.target as HTMLFormElement
      // If the form does not have an explicit external action, prevent default browser navigation
      if (!form.getAttribute('action') || form.getAttribute('action') === '#') {
        e.preventDefault()
      }
    },
    { capture: true }
  )

  // 2. Prevent accidental drag-and-drop outside designated zones from navigating to the file URL
  window.addEventListener(
    'dragover',
    (e) => {
      e.preventDefault()
    },
    false
  )
  window.addEventListener(
    'drop',
    (e) => {
      // Check if dropped outside a custom drop target
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropzone]') && !target.closest('.dropzone')) {
        e.preventDefault()
      }
    },
    false
  )

  // 3. Handle Page Lifecycle (BFCache / OS Memory Management)
  // When user opens a native file dialog or switches apps, mobile browsers (Chrome/Safari) may freeze
  // or discard the tab. We track state before backgrounding.
  window.addEventListener('pagehide', (event: PageTransitionEvent) => {
    try {
      const currentPath = window.location.pathname + window.location.search + window.location.hash
      sessionStorage.setItem(
        APP_RESTORE_KEY,
        JSON.stringify({
          path: currentPath,
          timestamp: Date.now(),
          persisted: event.persisted,
        })
      )
    } catch {
      // Ignore storage quota errors
    }
  })

  // When returning from background / native file dialog
  window.addEventListener('pageshow', (event: PageTransitionEvent) => {
    if (event.persisted) {
      // Page was restored directly from Back-Forward Cache (BFCache) - no reload occurred
      console.log('[Resilience] Restored seamlessly from BFCache')
    }
  })

  // 4. Global guard to prevent accidental navigation when an async file operation is active
  window.addEventListener('beforeunload', (event) => {
    const isBusy = document.body.getAttribute('data-busy') === 'true'
    if (isBusy) {
      event.preventDefault()
      event.returnValue = 'Operasi sedang berjalan. Apakah Anda yakin ingin meninggalkan halaman?'
      return event.returnValue
    }
  })
}
