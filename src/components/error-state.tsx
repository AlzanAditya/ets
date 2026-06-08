import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  title?: string
  message: string | null
  retryLabel?: string
  onRetry?: () => void
}

export function ErrorState({
  title = "Terjadi Kesalahan",
  message,
  retryLabel = "Coba Lagi",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[350px] flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-8 ring-destructive/5">
        <AlertTriangleIcon className="h-8 w-8 stroke-[1.5]" />
      </div>
      <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {message || "Gagal menghubungkan ke database Supabase. Periksa koneksi internet Anda."}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-6 gap-2 border-destructive/20 hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <RefreshCwIcon className="h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
