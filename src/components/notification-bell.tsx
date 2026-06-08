import * as React from "react"
import { BellIcon, CheckCircleIcon, ClockIcon, ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTransactions } from "@/hooks/use-transactions"
import type { TransactionWithRelations } from "@/services/transactions.service"

const TYPE_LABELS: Record<string, string> = {
  sale:     "Penjualan",
  purchase: "Pembelian",
  return:   "Retur",
  transfer: "Transfer",
}

const TYPE_COLORS: Record<string, string> = {
  sale:     "bg-emerald-500/15 text-emerald-400",
  purchase: "bg-blue-500/15 text-blue-400",
  return:   "bg-orange-500/15 text-orange-400",
  transfer: "bg-purple-500/15 text-purple-400",
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return "baru saja"
  if (mins  < 60) return `${mins} mnt lalu`
  if (hours < 24) return `${hours} jam lalu`
  return `${days} hari lalu`
}

interface PendingItemProps {
  txn: TransactionWithRelations
  onNavigate?: (url: string) => void
}

function PendingItem({ txn, onNavigate }: PendingItemProps) {
  const typeColor = TYPE_COLORS[txn.transaction_type] ?? "bg-muted text-muted-foreground"
  const typeLabel = TYPE_LABELS[txn.transaction_type] ?? txn.transaction_type

  return (
    <button
      type="button"
      onClick={() => onNavigate?.("/transaction")}
      className="group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {/* Type pill */}
      <span className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase leading-none tracking-wide ${typeColor}`}>
        {typeLabel}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
          {txn.transaction_code}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClockIcon className="size-3 shrink-0" />
          <span>{formatRelativeTime(txn.created_at)}</span>
          {txn.grand_total > 0 && (
            <>
              <span className="opacity-40">·</span>
              <span>
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(txn.grand_total)}
              </span>
            </>
          )}
        </div>
      </div>

      <ArrowRightIcon className="mt-1 size-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  )
}

/**
 * Purpose: display a notification bell in the site header with pending transaction count.
 * Responsibilities: fetch pending transactions, show badge, render dropdown list.
 * Expected props: optional onNavigate callback for navigating to the transaction page.
 * Usage notes: auto-refreshes every 60 s; closes dropdown on navigation click.
 */
export function NotificationBell({
  onNavigate,
}: {
  onNavigate?: (url: string) => void
}) {
  const [open, setOpen] = React.useState(false)

  // Fetch only pending transactions — lightweight query
  const { data: pending, loading } = useTransactions({ status: "pending" })

  const count = pending.length
  const capped = count > 99 ? "99+" : count > 0 ? String(count) : null

  function handleNavigate(url: string) {
    setOpen(false)
    onNavigate?.(url)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          id="notification-bell-trigger"
          variant="ghost"
          size="icon"
          className="relative size-8 text-muted-foreground hover:text-foreground"
          aria-label={count > 0 ? `${count} transaksi menunggu persetujuan` : "Notifikasi"}
        >
          <BellIcon className="size-4" />
          {capped && (
            <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex min-w-[1.1rem] items-center justify-center rounded-full bg-amber-500 px-1 py-px text-[0.55rem] font-bold leading-none text-black ring-2 ring-background">
              {capped}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 overflow-hidden rounded-xl border border-border/60 bg-background/95 p-0 shadow-xl backdrop-blur-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifikasi</p>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Memuat..."
                : count > 0
                ? `${count} transaksi menunggu persetujuan`
                : "Tidak ada notifikasi baru"}
            </p>
          </div>
          {count > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">
              {count} pending
            </span>
          )}
        </div>

        {/* Body */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            /* Skeleton */
            <div className="space-y-1 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5">
                  <div className="mt-0.5 h-4 w-12 animate-pulse rounded-md bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : count === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircleIcon className="size-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Semua antrean bersih!</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tidak ada transaksi yang menunggu persetujuan.
                </p>
              </div>
            </div>
          ) : (
            /* Pending list */
            <div className="space-y-0.5 p-2">
              {pending.slice(0, 10).map((txn) => (
                <PendingItem key={txn.transaction_id} txn={txn} onNavigate={handleNavigate} />
              ))}
              {count > 10 && (
                <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                  +{count - 10} transaksi lainnya
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {count > 0 && (
          <div className="border-t border-border/50 px-4 py-2.5">
            <button
              type="button"
              onClick={() => handleNavigate("/transaction")}
              className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
            >
              Lihat semua transaksi pending
              <ArrowRightIcon className="size-3" />
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
