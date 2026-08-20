import React from "react"

export interface PreloadableComponent<T extends React.ComponentType<any>>
  extends React.LazyExoticComponent<T> {
  preload: () => Promise<{ default: T }>
}

async function importWithRetry<T>(
  factory: () => Promise<T>,
  retries = 3,
  delayMs = 400
): Promise<T> {
  let attempt = 0
  while (attempt < retries) {
    try {
      return await factory()
    } catch (error: any) {
      attempt++
      const isChunkError =
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Importing a module script failed") ||
        error?.message?.includes("error loading dynamically imported module") ||
        error?.name === "ChunkLoadError"

      if (attempt >= retries) {
        if (isChunkError && typeof window !== "undefined") {
          const key = "ops:chunk_reload_timestamp"
          const lastReload = sessionStorage.getItem(key)
          const now = Date.now()
          if (!lastReload || now - Number(lastReload) > 10000) {
            sessionStorage.setItem(key, String(now))
            window.location.reload()
            return new Promise(() => {})
          }
        }
        throw error
      }
      await new Promise((res) => setTimeout(res, delayMs * attempt))
    }
  }
  return factory()
}

/**
 * Enhanced React.lazy wrapper that supports explicit chunk preloading, retry mechanisms, and in-memory caching.
 * Prevents re-fetching dynamic chunks and allows preloading on hover or route layout mount.
 */
export function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): PreloadableComponent<T> {
  let loadedComponent: { default: T } | null = null
  let factoryPromise: Promise<{ default: T }> | null = null

  const preload = () => {
    if (!factoryPromise) {
      factoryPromise = importWithRetry(factory)
        .then((module) => {
          loadedComponent = module
          return module
        })
        .catch((error) => {
          factoryPromise = null
          throw error
        })
    }
    return factoryPromise
  }

  const Component = React.lazy(() => {
    if (loadedComponent) {
      return Promise.resolve(loadedComponent)
    }
    return preload()
  }) as PreloadableComponent<T>

  Component.preload = preload

  return Component
}

