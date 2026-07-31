import { User, LogOut, ShieldCheck } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

/**
 * Worker Profil Page (Mobile First)
 * Profile page for logged-in workers.
 */
export default function WorkerProfil() {
  const { profile, user, role, logout } = useAuth()

  const displayName = profile?.full_name || profile?.name || user?.email || "Pekerja"
  const email = profile?.email || user?.email || "-"
  const workerCode = profile?.worker_code || "-"

  return (
    <div className="flex min-h-screen flex-col bg-background p-4 md:p-6 pb-20">
      <header className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Profil Pekerja</h1>
          <p className="text-xs text-muted-foreground">Informasi akun dan identitas</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
      </header>

      <main className="flex-1 space-y-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm flex items-center space-x-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted font-bold text-lg text-foreground">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-base">{displayName}</h2>
            <p className="text-xs text-muted-foreground">{email}</p>
            <div className="mt-1.5 flex items-center space-x-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <ShieldCheck className="mr-1 h-3 w-3" />
                {role.toUpperCase()}
              </span>
              {workerCode !== "-" && (
                <span className="text-xs text-muted-foreground font-mono">
                  #{workerCode}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={() => logout()}
            className="flex w-full items-center justify-center space-x-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </main>
    </div>
  )
}
