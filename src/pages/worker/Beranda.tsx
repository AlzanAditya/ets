import { HardHat, Activity, Clock, CheckCircle2 } from "lucide-react"

/**
 * Worker Beranda Page (Mobile First)
 * Placeholder homepage for field worker PWA.
 */
export default function WorkerBeranda() {
  return (
    <div className="flex min-h-screen flex-col bg-background p-4 md:p-6 pb-20">
      <header className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Beranda Pekerja</h1>
          <p className="text-xs text-muted-foreground">Sistem Pelacakan Lapangan ETS</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HardHat className="h-5 w-5" />
        </div>
      </header>

      <main className="flex-1 space-y-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center space-x-3 text-primary">
            <Activity className="h-5 w-5" />
            <h2 className="font-semibold text-sm">Status Tugas Hari Ini</h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Selamat datang di portal pekerja ETS. Pilih menu di bawah untuk melihat tugas dan jadwal kerja Anda.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-3 shadow-sm">
            <div className="flex items-center space-x-2 text-amber-500">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Pending</span>
            </div>
            <p className="mt-1 text-lg font-bold">0</p>
          </div>
          <div className="rounded-lg border bg-card p-3 shadow-sm">
            <div className="flex items-center space-x-2 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Selesai</span>
            </div>
            <p className="mt-1 text-lg font-bold">0</p>
          </div>
        </div>
      </main>
    </div>
  )
}
