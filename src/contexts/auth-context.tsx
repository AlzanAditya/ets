import * as React from "react"
import { supabase } from "@/lib/supabase"
import type { Session, User } from "@supabase/supabase-js"
import type { AdminRow } from "@/types/database"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Raw Supabase session — null while loading or unauthenticated */
  session: Session | null
  /** Raw Supabase user — null while loading or unauthenticated */
  user: User | null
  /** Admin row from `admins` table — null if not yet loaded */
  admin: AdminRow | null
  /** True while the initial session check is running */
  loading: boolean
  /** Call to sign out and clear all auth state */
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Purpose: provide auth state (session, user, admin profile) globally.
 * Responsibilities: subscribe to Supabase auth changes, fetch admin row once,
 *                   expose signOut helper.
 * Usage notes: wrap the entire app; access via useAuth().
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [user, setUser]       = React.useState<User | null>(null)
  const [admin, setAdmin]     = React.useState<AdminRow | null>(null)
  const [loading, setLoading] = React.useState(true)

  /** Fetch admin profile from `admins` table using the user's UUID */
  async function fetchAdmin(userId: string) {
    const { data } = await supabase
      .from("admins")
      .select("*")
      .eq("id", userId)
      .is("deleted_at", null)
      .single()
    setAdmin(data ?? null)
  }

  React.useEffect(() => {
    // 1. Load existing session on mount
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) fetchAdmin(s.user.id)
      setLoading(false)
    })

    // 2. Subscribe to future auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          fetchAdmin(s.user.id)
        } else {
          setAdmin(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = React.useMemo<AuthContextValue>(
    () => ({ session, user, admin, loading, signOut }),
    [session, user, admin, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Access auth state anywhere inside AuthProvider.
 * Throws if called outside AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
