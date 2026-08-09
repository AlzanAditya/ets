import React from "react"

export interface PreloadableComponent<T extends React.ComponentType<any>>
  extends React.LazyExoticComponent<T> {
  preload: () => Promise<{ default: T }>
}

/**
 * Enhanced React.lazy wrapper that supports explicit chunk preloading and in-memory caching.
 * Prevents re-fetching dynamic chunks and allows preloading on hover or route layout mount.
 */
export function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): PreloadableComponent<T> {
  let loadedComponent: { default: T } | null = null
  let factoryPromise: Promise<{ default: T }> | null = null

  const preload = () => {
    if (!factoryPromise) {
      factoryPromise = factory()
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
