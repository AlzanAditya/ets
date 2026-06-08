import * as React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

/**
 * Purpose: guard protected routes — redirect to /login if unauthenticated.
 * Responsibilities: show full-page skeleton while session loads, then either
 *                   render children or redirect.
 * Usage notes: wrap any <Route> that requires authentication.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <AuthLoadingSkeleton />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// ─── Full-page auth loading skeleton ─────────────────────────────────────────

function AuthLoadingSkeleton() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* Animated logo placeholder */}
        <div className="size-12 rounded-xl bg-primary/20 animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5 pt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="size-1.5 rounded-full bg-primary/40 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
