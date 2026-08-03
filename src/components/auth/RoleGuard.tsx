import * as React from "react"
import { Navigate } from "react-router-dom"
import { useAuth, type UserRole } from "@/contexts/auth-context"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"

interface RoleGuardProps {
  allow: UserRole[]
  redirectTo?: string
  children: React.ReactNode
}

/**
 * RoleGuard Component
 * Purpose: Protect routes based on user role.
 * - While AuthContext is loading, renders a loading state.
 * - If user's role is NOT in the `allow` list:
 *   - If worker tries to access unauthorized page -> redirect to /worker/home
 *   - If admin/super_admin tries to access unauthorized page -> redirect to /dashboard
 *   - Or use explicit `redirectTo` if provided.
 * - If user's role is in the `allow` list, renders `children`.
 */
export function RoleGuard({ allow, redirectTo, children }: RoleGuardProps) {
  const { role, loading, user } = useAuth()

  React.useEffect(() => {
    if (!loading) {
      console.log(`[RoleGuard] Checked role: "${role}", user: "${user?.email}", allow: [${allow.join(", ")}]`)
    }
  }, [role, loading, user?.email, allow])

  if (loading) {
    return (
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  // Unauthenticated or guest role must be redirected to /login, not cross-redirected between routes
  if (!user || role === "guest") {
    console.warn(`[RoleGuard] Access denied for guest/unauthenticated user (${user?.email || 'no-user'}). Redirecting to /login`)
    return <Navigate to="/login" replace />
  }

  if (!allow.includes(role)) {
    console.warn(`[RoleGuard] Role "${role}" not in allowed list [${allow.join(", ")}]. Actioning role-based redirect.`)
    if (role === "worker") {
      console.log(`[RoleGuard] Redirecting worker to /worker/home`)
      return <Navigate to="/worker/home" replace />
    }
    if (role === "admin" || role === "super_admin") {
      console.log(`[RoleGuard] Redirecting admin to /dashboard`)
      return <Navigate to="/dashboard" replace />
    }
    if (redirectTo) {
      console.log(`[RoleGuard] Redirecting to ${redirectTo}`)
      return <Navigate to={redirectTo} replace />
    }
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default RoleGuard
