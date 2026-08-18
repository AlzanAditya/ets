import * as React from "react";
import {
  ShieldCheck,
  Calendar,
  Clock,
  History,
  PlusCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { productWarrantiesService } from "@/services/product-warranties.service";
import type { ProductCurrentWarrantyRow, ProductWarrantyRow } from "@/types/database";
import { WarrantyExtensionDialog } from "./warranty-extension-dialog";

interface ProductWarrantyCardProps {
  productId: string;
  productName?: string;
  serialNumber?: string;
  productStatus?: string;
}

export function ProductWarrantyCard({
  productId,
  productName,
  serialNumber,
  productStatus,
}: ProductWarrantyCardProps) {
  const [loading, setLoading] = React.useState(true);
  const [currentWarranty, setCurrentWarranty] = React.useState<ProductCurrentWarrantyRow | null>(null);
  const [history, setHistory] = React.useState<ProductWarrantyRow[]>([]);
  const [showHistory, setShowHistory] = React.useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = React.useState(false);

  const loadWarrantyData = React.useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const [cur, hist] = await Promise.all([
        productWarrantiesService.getCurrentWarranty(productId),
        productWarrantiesService.getWarrantyHistory(productId),
      ]);
      setCurrentWarranty(cur);
      setHistory(hist);
    } catch (err) {
      console.warn("Failed to load warranty data:", err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  React.useEffect(() => {
    loadWarrantyData();
  }, [loadWarrantyData]);

  const hasWarranty = Boolean(currentWarranty?.end_date);
  const isActive = currentWarranty?.is_active ?? false;
  const daysRemaining = currentWarranty?.days_remaining ?? 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              isActive
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : hasWarranty
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-zinc-800 border-zinc-700 text-zinc-400"
            }`}
          >
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100">Status & Riwayat Garansi</h3>
              {hasWarranty && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 ${
                    isActive
                      ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                      : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                  }`}
                >
                  {isActive ? "Garansi Aktif" : "Garansi Berakhir"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {hasWarranty
                ? `Masa perlindungan resmi unit produk dari PT ETS.`
                : productStatus === "pending"
                ? "Produk masih dalam status pending (menunggu instalasi pertama)."
                : "Belum ada data riwayat garansi tercatat."}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsExtensionModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 shadow-sm self-start sm:self-center"
        >
          <PlusCircle className="size-3.5" />
          <span>Perpanjang Garansi</span>
        </Button>
      </div>

      {/* Body: Current warranty details */}
      <div className="p-4 sm:p-5 space-y-4">
        {loading ? (
          <div className="text-xs text-zinc-500 py-2">Memuat status garansi...</div>
        ) : hasWarranty ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Start Date */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                <Calendar className="size-3.5 text-zinc-500" />
                <span>Tanggal Mulai</span>
              </div>
              <div className="text-sm font-mono font-bold text-zinc-200">
                {currentWarranty?.start_date
                  ? new Date(currentWarranty.start_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "-"}
              </div>
            </div>

            {/* End Date */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                <Calendar className="size-3.5 text-zinc-500" />
                <span>Tanggal Berakhir</span>
              </div>
              <div className="text-sm font-mono font-bold text-zinc-200">
                {currentWarranty?.end_date
                  ? new Date(currentWarranty.end_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "-"}
              </div>
            </div>

            {/* Remaining Days */}
            <div
              className={`p-3 rounded-xl border space-y-1 ${
                isActive
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-rose-500/5 border-rose-500/20"
              }`}
            >
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                <Clock className="size-3.5 text-zinc-500" />
                <span>Sisa Waktu Garansi</span>
              </div>
              <div
                className={`text-sm font-mono font-bold ${
                  isActive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isActive ? `${daysRemaining} Hari Tersisa` : "Masa Garansi Berakhir"}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center space-y-2">
            <AlertTriangle className="size-5 text-amber-500/70 mx-auto" />
            <p className="text-xs text-zinc-400">
              Belum ada record garansi yang tercatat di tabel <code>product_warranties</code>.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExtensionModalOpen(true)}
              className="text-xs border-zinc-800 rounded-xl"
            >
              Tambah Garansi Baru
            </Button>
          </div>
        )}

        {/* History Accordion Toggle */}
        {history.length > 0 && (
          <div className="pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors py-1"
            >
              <div className="flex items-center gap-2">
                <History className="size-3.5 text-emerald-400" />
                <span>Riwayat Periode Garansi ({history.length} Record)</span>
              </div>
              {showHistory ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>

            {showHistory && (
              <div className="mt-3 space-y-2">
                {history.map((h, idx) => (
                  <div
                    key={h.warranty_id}
                    className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-zinc-500 text-[11px]">#{idx + 1}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono uppercase px-1.5 py-0 ${
                          h.warranty_type === "initial"
                            ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
                            : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                        }`}
                      >
                        {h.warranty_type === "initial" ? "Garansi Awal" : "Perpanjangan"}
                      </Badge>
                      <span className="font-mono text-zinc-300">
                        {h.start_date} s/d {h.end_date}
                      </span>
                      {h.duration_months && (
                        <span className="text-[11px] text-zinc-500">
                          ({h.duration_months} bln)
                        </span>
                      )}
                    </div>

                    {h.notes && (
                      <div className="text-[11px] text-zinc-400 italic">
                        "{h.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Extension Modal */}
      <WarrantyExtensionDialog
        open={isExtensionModalOpen}
        onOpenChange={setIsExtensionModalOpen}
        productId={productId}
        productName={productName}
        serialNumber={serialNumber}
        currentWarranty={currentWarranty}
        onWarrantyUpdated={() => {
          loadWarrantyData();
        }}
      />
    </div>
  );
}
