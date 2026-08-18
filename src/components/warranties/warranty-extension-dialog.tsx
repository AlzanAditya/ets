import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Calendar, Clock, Loader2, RefreshCw } from "lucide-react";
import { productWarrantiesService } from "@/services/product-warranties.service";
import type { ProductCurrentWarrantyRow, ProductWarrantyRow } from "@/types/database";
import { toast } from "sonner";

interface WarrantyExtensionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName?: string;
  serialNumber?: string;
  currentWarranty?: ProductCurrentWarrantyRow | null;
  onWarrantyUpdated?: (newWarranty: ProductWarrantyRow) => void;
}

export function WarrantyExtensionDialog({
  open,
  onOpenChange,
  productId,
  productName,
  serialNumber,
  currentWarranty,
  onWarrantyUpdated,
}: WarrantyExtensionDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [durationMonths, setDurationMonths] = React.useState<number>(12);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Initialize start date and end date
  React.useEffect(() => {
    if (!open) return;

    // Start date: if current active warranty exists, start the day after current end_date, else today
    const now = new Date();
    let initialStart = now.toISOString().split("T")[0];

    if (currentWarranty?.end_date) {
      const curEnd = new Date(currentWarranty.end_date);
      if (curEnd >= now) {
        // Add 1 day
        curEnd.setDate(curEnd.getDate() + 1);
        initialStart = curEnd.toISOString().split("T")[0];
      }
    }

    setStartDate(initialStart);
    calculateEndDate(initialStart, 12);
    setDurationMonths(12);
    setNotes("");
  }, [open, currentWarranty]);

  const calculateEndDate = (start: string, months: number) => {
    if (!start) return;
    const d = new Date(start);
    d.setMonth(d.getMonth() + months);
    // End date is 1 day before exact month anniversary
    d.setDate(d.getDate() - 1);
    setEndDate(d.toISOString().split("T")[0]);
  };

  const handleDurationChange = (months: number) => {
    setDurationMonths(months);
    calculateEndDate(startDate, months);
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    calculateEndDate(date, durationMonths);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error("Tentukan tanggal mulai dan selesai garansi");
      return;
    }

    try {
      setSubmitting(true);
      const created = await productWarrantiesService.extendWarranty({
        product_id: productId,
        start_date: startDate,
        end_date: endDate,
        duration_months: durationMonths,
        notes: notes.trim() || null,
        warranty_type: "extension",
      });

      toast.success("Perpanjangan garansi berhasil dicatat dalam riwayat garansi");
      onWarrantyUpdated?.(created);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to extend warranty:", err);
      toast.error(err.message || "Gagal memperpanjang garansi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider">
            <ShieldCheck className="size-4" />
            <span>Warranty Management</span>
          </div>
          <DialogTitle className="text-lg font-bold text-zinc-100">
            Perpanjang Garansi Produk
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            {productName || "Produk"} • No. Seri:{" "}
            <span className="font-mono text-zinc-200">{serialNumber || productId}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Warranty Status Banner */}
          {currentWarranty?.end_date && (
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Garansi Saat Ini:</span>
              <Badge
                variant="outline"
                className={`font-mono text-[11px] ${
                  currentWarranty.is_active
                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                    : "text-rose-400 border-rose-500/30 bg-rose-500/10"
                }`}
              >
                s/d {currentWarranty.end_date} (
                {currentWarranty.is_active ? `${currentWarranty.days_remaining} hari` : "Expired"})
              </Badge>
            </div>
          )}

          {/* Duration Preset Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
              <Clock className="size-3.5 text-emerald-400" />
              <span>Pilihan Durasi Perpanjangan</span>
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {[6, 12, 24, 36].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleDurationChange(m)}
                  className={`py-2 px-3 rounded-xl text-xs font-mono font-semibold border transition-all ${
                    durationMonths === m
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-sm"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  {m} Bulan
                </button>
              ))}
            </div>
          </div>

          {/* Dates Input */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Calendar className="size-3 text-zinc-500" />
                <span>Tanggal Mulai</span>
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="h-9 text-xs bg-zinc-900 border-zinc-800 rounded-xl text-zinc-100"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Calendar className="size-3 text-zinc-500" />
                <span>Tanggal Selesai</span>
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs bg-zinc-900 border-zinc-800 rounded-xl text-zinc-100"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-300 font-semibold">
              Keterangan / Nomor Kontrak (Opsional)
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Perpanjangan Kontrak SLA 2026-2027"
              className="h-9 text-xs bg-zinc-900 border-zinc-800 rounded-xl text-zinc-100"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400 rounded-xl text-xs gap-1.5 shadow-sm"
            >
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5 stroke-[2.5]" />
              )}
              <span>Simpan Perpanjangan</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
