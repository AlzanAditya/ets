import * as React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnimationContextValue {
  /** True = animations ON (default); false = all transitions/animations disabled */
  animationsEnabled: boolean
  toggleAnimations: () => void
}

const STORAGE_KEY = "ets:animations-enabled"

const AnimationContext = React.createContext<AnimationContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Purpose: manage user preference for UI animations/transitions.
 * Responsibilities: persist preference to localStorage, apply/remove the
 *                   `.no-transitions` class on <html> so CSS utility fires.
 * Usage notes: wrap app root; access via useAnimation().
 */
export function AnimationProvider({ children }: { children: React.ReactNode }) {
  const [animationsEnabled, setAnimationsEnabled] = React.useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === null ? true : stored === "true"
    } catch {
      return true
    }
  })

  // Sync class on <html> whenever state changes
  React.useEffect(() => {
    const root = document.documentElement
    if (animationsEnabled) {
      root.classList.remove("no-transitions")
    } else {
      root.classList.add("no-transitions")
    }
  }, [animationsEnabled])

  function toggleAnimations() {
    setAnimationsEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch { /* ignore */ }
      return next
    })
  }

  const value = React.useMemo<AnimationContextValue>(
    () => ({ animationsEnabled, toggleAnimations }),
    [animationsEnabled]
  )

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnimation(): AnimationContextValue {
  const ctx = React.useContext(AnimationContext)
  if (!ctx) throw new Error("useAnimation must be used inside <AnimationProvider>")
  return ctx
}
