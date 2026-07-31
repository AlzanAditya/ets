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
 *   - If worker tries to access unauthorized page -> redirect to /worker/beranda
 *   - If admin/super_admin tries to access unauthorized page -> redirect to /dashboard
 *   - Or use explicit `redirectTo` if provided.
 * - If user's role is in the `allow` list, renders `children`.
 */
export function RoleGuard({ allow, redirectTo, children }: RoleGuardProps) {
  const { role, loading } = useAuth()

  if (loading) {
    return (
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  if (!allow.includes(role)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />
    }
    if (role === "worker") {
      return <Navigate to="/worker/beranda" replace />
    }
    if (role === "admin" || role === "super_admin") {
      return <Navigate to="/dashboard" replace />
    }
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default RoleGuard
