import * as React from "react"
import { supabase } from "@/lib/supabase"
import type { Session, User } from "@supabase/supabase-js"
import type { AdminRow, WorkerRow } from "@/types/database"

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "super_admin" | "admin" | "worker" | "guest"

export interface AuthContextValue {
  /** Raw Supabase session — null while loading or unauthenticated */
  session: Session | null
  /** Raw Supabase user — null while loading or unauthenticated */
  user: User | null
  /** User role determined by profile lookup: super_admin | admin | worker | guest */
  role: UserRole
  /** Generic profile row — AdminRow or WorkerRow or null */
  profile: AdminRow | WorkerRow | any | null
  /** Admin row if user exists in `admins` table — null otherwise */
  admin: AdminRow | null
  /** Worker row if user exists in `workers` table — null otherwise */
  worker: WorkerRow | null
  /** True while the initial session & profile check is running */
  loading: boolean
  /** Call to sign out and clear all auth state */
  signOut: () => Promise<void>
  /** Alias for signOut */
  logout: () => Promise<void>
  /** Re-fetch profile data for current authenticated user */
  refreshProfile: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Purpose: provide auth session, user, role, and profile globally.
 * Responsibilities:
 *   1. Subscribe to Supabase auth session changes.
 *   2. Resolve profile in order:
 *      auth.uid() -> check `admins` -> if found, role = admin | super_admin
 *                 -> if not found, check `workers` -> role = worker.
 *   3. Expose user, role, profile, loading, and sign-out helpers globally.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [user, setUser]       = React.useState<User | null>(null)
  const [role, setRole]       = React.useState<UserRole>("guest")
  const [profile, setProfile] = React.useState<AdminRow | WorkerRow | any | null>(null)
  const [admin, setAdmin]     = React.useState<AdminRow | null>(null)
  const [worker, setWorker]   = React.useState<WorkerRow | null>(null)
  const [loading, setLoading] = React.useState(true)

  /**
   * Fetch profile data based on auth_user_id (or auth.uid()):
   * Order:
   * 1. Check `admins` table by id or auth_user_id.
   * 2. If not found, check `workers` table by auth_user_id, id, or email.
   */
  const fetchProfile = React.useCallback(async (userId: string, email?: string | null) => {
    try {
      // 1. Check `admins` table
      let adminRecord: AdminRow | null = null

      const { data: adminById } = await supabase
        .from("admins")
        .select("*")
        .eq("id", userId)
        .is("deleted_at", null)
        .maybeSingle()

      if (adminById) {
        adminRecord = adminById
      } else {
        try {
          const { data: adminByAuth } = await (supabase as any)
            .from("admins")
            .select("*")
            .eq("auth_user_id", userId)
            .is("deleted_at", null)
            .maybeSingle()
          if (adminByAuth) adminRecord = adminByAuth
        } catch {
          // Ignore if auth_user_id column doesn't exist on admins
        }
      }

      if (adminRecord) {
        const determinedRole: UserRole =
          adminRecord.role === "super_admin" ? "super_admin" : "admin"
        setAdmin(adminRecord)
        setWorker(null)
        setProfile(adminRecord)
        setRole(determinedRole)
        return
      }

      // 2. Check `workers` table
      let workerRecord: WorkerRow | null = null

      try {
        const { data: workerByAuth } = await (supabase as any)
          .from("workers")
          .select("*, worker_positions(*)")
          .eq("auth_user_id", userId)
          .maybeSingle()
        if (workerByAuth) workerRecord = workerByAuth
      } catch {
        // Ignore if auth_user_id column query fails
      }

      if (!workerRecord) {
        try {
          const { data: workerById } = await (supabase as any)
            .from("workers")
            .select("*, worker_positions(*)")
            .eq("id", userId)
            .maybeSingle()
          if (workerById) workerRecord = workerById
        } catch {
          // Ignore
        }
      }

      if (!workerRecord && email) {
        try {
          const { data: workerByEmail } = await (supabase as any)
            .from("workers")
            .select("*, worker_positions(*)")
            .eq("email", email)
            .maybeSingle()
          if (workerByEmail) workerRecord = workerByEmail
        } catch {
          // Ignore
        }
      }

      if (workerRecord) {
        setAdmin(null)
        setWorker(workerRecord)
        setProfile(workerRecord)
        setRole("worker")
        return
      }

      // 3. Neither found — default to guest or fallback worker if authenticated
      setAdmin(null)
      setWorker(null)
      setProfile(null)
      setRole("guest")
    } catch (err) {
      console.error("Error fetching user profile:", err)
      setAdmin(null)
      setWorker(null)
      setProfile(null)
      setRole("guest")
    }
  }, [])

  const refreshProfile = React.useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id, user.email)
    }
  }, [user, fetchProfile])

  React.useEffect(() => {
    let isMounted = true

    // 1. Initial session check
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!isMounted) return
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        await fetchProfile(s.user.id, s.user.email)
      } else {
        setAdmin(null)
        setWorker(null)
        setProfile(null)
        setRole("guest")
      }
      if (isMounted) setLoading(false)
    })

    // 2. Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (!isMounted) return
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          await fetchProfile(s.user.id, s.user.email)
        } else {
          setAdmin(null)
          setWorker(null)
          setProfile(null)
          setRole("guest")
        }
        if (isMounted) setLoading(false)
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setAdmin(null)
    setWorker(null)
    setProfile(null)
    setRole("guest")
  }

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      role,
      profile,
      admin,
      worker,
      loading,
      signOut,
      logout: signOut,
      refreshProfile,
    }),
    [session, user, role, profile, admin, worker, loading, signOut, refreshProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Access auth state anywhere inside AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}

/**
 * User Context Hook — exposes user, profile, and loading state.
 */
export function useUser() {
  const { user, profile, loading, refreshProfile } = useAuth()
  return { user, profile, loading, refreshProfile }
}

/**
 * Role Context Hook — exposes role and helper booleans (isAdmin, isWorker, etc.).
 */
export function useRole() {
  const { role, loading } = useAuth()
  return {
    role,
    loading,
    isAdmin: role === "admin" || role === "super_admin",
    isSuperAdmin: role === "super_admin",
    isWorker: role === "worker",
    isGuest: role === "guest",
  }
}

