import { History } from "lucide-react"

/**
 * Worker Histori Page (Mobile First)
 * History of completed work orders for workers.
 */
export default function WorkerHistori() {
  return (
    <div className="flex min-h-screen flex-col bg-background p-4 md:p-6 pb-20">
      <header className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Histori Pekerjaan</h1>
          <p className="text-xs text-muted-foreground">Catatan pekerjaan yang telah selesai</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <History className="h-5 w-5" />
        </div>
      </header>

      <main className="flex-1">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <History className="h-10 w-10 text-muted-foreground mb-3" />
          <h2 className="font-semibold text-sm">Riwayat Masih Kosong</h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Pekerjaan yang telah Anda selesaikan dan verifikasi akan diarsipkan di sini.
          </p>
        </div>
      </main>
    </div>
  )
}
