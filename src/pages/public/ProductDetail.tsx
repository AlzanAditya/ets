import { useParams } from "react-router-dom"
import { QrCode, Package, ShieldCheck, FileText } from "lucide-react"

/**
 * Public Product Detail Page
 * Accessible via `/p/:serial_number`
 * Displays public product tracking information based on serial number.
 */
export default function PublicProductDetail() {
  const { serial_number } = useParams<{ serial_number: string }>()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Branding */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
              ETS
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Electrical Tracking System</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verifikasi Produk Resmi</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Terverifikasi
          </span>
        </header>

        {/* Product Serial Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Serial Number
              </span>
              <h2 className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {serial_number || "ETS-PRODUCT-000"}
              </h2>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
              <QrCode className="h-6 w-6" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm">
            <div className="flex items-center space-x-3">
              <Package className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Status Produk</p>
                <p className="font-medium">Dalam Pengawasan ETS</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Dokumentasi</p>
                <p className="font-medium">Tersedia via Sistem</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Placeholder */}
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-white/50 dark:bg-slate-900/50">
          <Package className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm font-medium">Informasi Detail Produk ETS</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Detail spesifikasi, riwayat pemeliharaan, dan histori event untuk serial number{" "}
            <span className="font-mono font-semibold">{serial_number}</span> sedang disiapkan dari database ETS.
          </p>
        </div>

        <footer className="text-center text-xs text-slate-400 pt-4">
          &copy; {new Date().getFullYear()} PT Electrical Tracking System. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
