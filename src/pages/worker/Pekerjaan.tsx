import { Briefcase } from "lucide-react"

/**
 * Worker Pekerjaan Page (Mobile First)
 * List of assigned field tasks for workers.
 */
export default function WorkerPekerjaan() {
  return (
    <div className="flex min-h-screen flex-col bg-background p-4 md:p-6 pb-20">
      <header className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Daftar Pekerjaan</h1>
          <p className="text-xs text-muted-foreground">Tugas dan servis teknis terlampir</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Briefcase className="h-5 w-5" />
        </div>
      </header>

      <main className="flex-1">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground mb-3" />
          <h2 className="font-semibold text-sm">Belum Ada Pekerjaan Aktif</h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Daftar pekerjaan teknis dan pemeliharaan akan muncul di sini ketika ditugaskan oleh Admin.
          </p>
        </div>
      </main>
    </div>
  )
}
