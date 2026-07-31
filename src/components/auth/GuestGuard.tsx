import * as React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"

interface GuestGuardProps {
  children: React.ReactNode
}

/**
 * GuestGuard Component
 * Purpose: Protect public auth routes (e.g. /login) from already authenticated users.
 * - While loading, renders loading state.
 * - If user is logged in:
 *   - super_admin / admin -> Redirect to /dashboard
 *   - worker -> Redirect to /worker/beranda
 * - If unauthenticated, renders children (e.g. LoginForm).
 */
export function GuestGuard({ children }: GuestGuardProps) {
  const { session, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-xl bg-primary/20 animate-pulse" />
          <div className="flex flex-col items-center gap-2">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (session) {
    if (role === "worker") {
      return <Navigate to="/worker/beranda" replace />
    }
    if (role === "admin" || role === "super_admin") {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}

export default GuestGuard
