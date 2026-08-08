import * as React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { clearStoredReturnUrl, getSafeReturnUrl, getStoredReturnUrl } from "@/lib/auth-utils"

interface GuestGuardProps {
  children: React.ReactNode
}

/**
 * GuestGuard Component
 * Purpose: Protect public auth routes (e.g. /login) from already authenticated users.
 * - While loading, renders loading state.
 * - If user is logged in:
 *   - Redirects to return URL if exists and safe
 *   - Otherwise: super_admin / admin -> /dashboard, worker -> /worker/home
 * - If unauthenticated, renders children (e.g. LoginForm).
 */
export function GuestGuard({ children }: GuestGuardProps) {
  const { session, role, loading } = useAuth()
  const location = useLocation()

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
    // Check for return URL from state, search params, or sessionStorage
    const stateFrom = location.state?.from
    let candidateUrl: string | null = null
    if (stateFrom) {
      candidateUrl = typeof stateFrom === "string" ? stateFrom : (stateFrom.pathname + (stateFrom.search || "") + (stateFrom.hash || ""))
    }
    if (!candidateUrl) {
      const searchParams = new URLSearchParams(location.search)
      candidateUrl = searchParams.get("redirect") || searchParams.get("returnUrl")
    }
    if (!candidateUrl) {
      candidateUrl = getStoredReturnUrl()
    }

    const safeUrl = getSafeReturnUrl(candidateUrl)
    if (safeUrl) {
      clearStoredReturnUrl()
      return <Navigate to={safeUrl} replace />
    }

    if (role === "worker") {
      return <Navigate to="/worker/home" replace />
    }
    if (role === "admin" || role === "super_admin") {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}

export default GuestGuard
