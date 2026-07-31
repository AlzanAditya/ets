import * as React from "react"
import { Navigate } from "react-router-dom"
import { useAuth, type UserRole } from "@/contexts/auth-context"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"

interface RoleGuardProps {
  allow: UserRole[]
  children: React.ReactNode
}

/**
 * RoleGuard Component
 * Purpose: Protect routes based on user role.
 * - While AuthContext is loading, renders a loading state.
 * - If user's role is NOT in the `allow` list, redirects to /dashboard.
 * - If user's role is in the `allow` list, renders `children`.
 */
export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { role, loading } = useAuth()

  if (loading) {
    return (
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    )
  }

  if (!allow.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default RoleGuard
