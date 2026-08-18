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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Search,
  Layers,
  CheckSquare,
  Square,
  X,
  Calendar,
  Clock,
  AlertCircle,
  Wrench,
  PackageCheck,
  Building2,
} from "lucide-react";
import { productsService, type ProductWithRelations } from "@/services/products.service";
import { productEventsService, type EventType, type ProductEventData } from "@/services/product-events.service";
import { toast } from "sonner";

interface CreateMultiProductEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProductId?: string;
  defaultEventType?: EventType;
  onEventCreated?: (newEvent: ProductEventData) => void;
}

export function CreateMultiProductEventDialog({
  open,
  onOpenChange,
  defaultProductId,
  defaultEventType = "maintenance",
  onEventCreated,
}: CreateMultiProductEventDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [products, setProducts] = React.useState<ProductWithRelations[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [clientFilter, setClientFilter] = React.useState<string>("all");

  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([]);
  const [eventType, setEventType] = React.useState<EventType>(defaultEventType);
  const [eventTitle, setEventTitle] = React.useState(
    defaultEventType === "installation" ? "INSTALASI" : "MAINTENANCE"
  );
  const [isScheduled, setIsScheduled] = React.useState(false);
  const [scheduledDate, setScheduledDate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Load products when modal opens
  React.useEffect(() => {
    if (!open) return;

    setEventType(defaultEventType);
    setEventTitle(defaultEventType === "installation" ? "INSTALASI" : "MAINTENANCE");
    setIsScheduled(false);
    setScheduledDate("");
    setNotes("");
    setSearchTerm("");
    setClientFilter("all");

    if (defaultProductId) {
      setSelectedProductIds([defaultProductId]);
    } else {
      setSelectedProductIds([]);
    }

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const list = await productsService.getProducts({ limit: 500 });
        setProducts(list);
      } catch (err) {
        console.error("Failed to load products for event dialog:", err);
        toast.error("Gagal memuat daftar produk");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [open, defaultProductId, defaultEventType]);

  // When eventType changes, reset invalid selected products according to lifecycle rules
  const handleEventTypeChange = (newType: EventType) => {
    setEventType(newType);
    setEventTitle(newType === "installation" ? "INSTALASI" : "MAINTENANCE");
    setSelectedProductIds([]); // Clear selection to prevent mixing lifecycles
  };

  // Extract unique clients for filtering
  const uniqueClients = React.useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      if (p.client?.client_id && p.client?.client_name) {
        map.set(p.client.client_id, p.client.client_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  // Lifecycle Rule Filter:
  // - Installation: ONLY "pending" products
  // - Maintenance: ONLY "warranty" products
  const eligibleStatus = eventType === "installation" ? "pending" : "warranty";

  const eligibleProducts = React.useMemo(() => {
    return products.filter((p) => {
      if (eventType === "installation") {
        return p.status === "pending";
      } else {
        return p.status === "warranty" || (p.status as string) === "garansi";
      }
    });
  }, [products, eventType]);

  const filteredProducts = React.useMemo(() => {
    return eligibleProducts.filter((p) => {
      if (clientFilter !== "all" && p.current_client_id !== clientFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const name = (p.product_name || "").toLowerCase();
      const code = (p.product_code || "").toLowerCase();
      const serial = (p.serial_number || "").toLowerCase();
      const client = (p.client?.client_name || "").toLowerCase();
      return name.includes(q) || code.includes(q) || serial.includes(q) || client.includes(q);
    });
  }, [eligibleProducts, clientFilter, searchTerm]);

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredProducts.map((p) => p.product_id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductIds.length === 0) {
      toast.error("Pilih minimal satu produk untuk event ini");
      return;
    }

    if (isScheduled && !scheduledDate) {
      toast.error("Tentukan tanggal jadwal untuk event terjadwal");
      return;
    }

    try {
      setSubmitting(true);
      const created = await productEventsService.createMultiProductEvent({
        product_ids: selectedProductIds,
        event_type: eventType,
        title: eventTitle.trim() || (eventType === "installation" ? "INSTALASI" : "MAINTENANCE"),
        is_scheduled: isScheduled,
        status: isScheduled ? "scheduled" : "active",
        scheduled_date: isScheduled ? scheduledDate : null,
        scheduled_at: isScheduled ? scheduledDate : null,
        notes: notes.trim() || null,
      });

      const modeText = isScheduled ? "dijadwalkan" : "dimulai langsung";
      toast.success(
        `Event ${created.title} berhasil ${modeText} untuk ${selectedProductIds.length} produk`
      );
      onEventCreated?.(created);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to create multi-product event:", err);
      toast.error(err.message || "Gagal membuat event produk");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden flex flex-col max-h-[92vh]">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-wider">
            <Layers className="size-4" />
            <span>Event Management</span>
          </div>
          <DialogTitle className="text-lg font-bold text-zinc-100">
            Buat Event Baru (Multi-Produk)
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Kelompokkan satu atau lebih produk dengan lifecycle yang sesuai ke dalam event kerja.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Event Configuration: Type & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
                {eventType === "installation" ? (
                  <PackageCheck className="size-3.5 text-blue-400" />
                ) : (
                  <Wrench className="size-3.5 text-amber-400" />
                )}
                <span>Jenis Event</span>
              </Label>
              <select
                value={eventType}
                onChange={(e) => handleEventTypeChange(e.target.value as EventType)}
                className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                <option value="installation">Instalasi (Hanya Produk Pending)</option>
                <option value="maintenance">Maintenance (Hanya Produk Warranty)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Judul / Kode Event</Label>
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Contoh: INSTALASI BATCH 1 atau MAINTENANCE Q3"
                className="h-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-100 rounded-xl"
                required
              />
            </div>
          </div>

          {/* Scheduling Configuration */}
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Mode Penjadwalan</div>
                  <div className="text-[11px] text-zinc-400">
                    Jadwalkan terlebih dahulu atau mulai pengerjaan saat ini juga
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsScheduled(false)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                    !isScheduled
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Mulai Langsung
                </button>
                <button
                  type="button"
                  onClick={() => setIsScheduled(true)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                    isScheduled
                      ? "bg-amber-500 text-zinc-950 font-bold shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Jadwalkan Nanti
                </button>
              </div>
            </div>

            {isScheduled && (
              <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-[11px] text-zinc-300 flex items-center gap-1">
                    <Clock className="size-3 text-amber-400" />
                    <span>Waktu / Tanggal Pengerjaan (Scheduled Date)</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-lg text-zinc-100"
                    required={isScheduled}
                  />
                </div>
                <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/60 flex-1">
                  Status produk tetap{" "}
                  <strong className="text-amber-300 uppercase">{eligibleStatus}</strong> sampai
                  event resmi dijalankan.
                </div>
              </div>
            )}
          </div>

          {/* Optional Event Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-300 font-semibold">Catatan Event (Opsional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan teknis pengerjaan, lokasi, atau instruksi khusus..."
              className="h-9 text-xs bg-zinc-900 border-zinc-800 text-zinc-100 rounded-xl"
            />
          </div>

          {/* Selected Products Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-300 font-semibold flex items-center gap-2">
                <span>Produk Terpilih ({selectedProductIds.length})</span>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono px-2 py-0 border-amber-500/30 text-amber-400 bg-amber-500/10"
                >
                  Syarat: {eligibleStatus}
                </Badge>
              </Label>
              {selectedProductIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedProductIds([])}
                  className="text-[11px] text-zinc-400 hover:text-rose-400 transition-colors"
                >
                  Reset Pilihan
                </button>
              )}
            </div>

            {selectedProductIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 max-h-24 overflow-y-auto">
                {selectedProductIds.map((pId) => {
                  const p = products.find((prod) => prod.product_id === pId);
                  return (
                    <Badge
                      key={pId}
                      variant="secondary"
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs py-0.5 px-2 gap-1.5 rounded-lg"
                    >
                      <span className="font-mono font-medium">
                        {p?.serial_number || p?.product_code || pId.slice(0, 8)}
                      </span>
                      {p?.client?.client_name && (
                        <span className="text-[10px] text-zinc-400">
                          ({p.client.client_name})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleSelectProduct(pId)}
                        className="hover:text-rose-400 transition-colors ml-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500 flex items-center justify-center gap-1.5">
                <AlertCircle className="size-3.5 text-zinc-500" />
                <span>
                  Belum ada produk dipilih. Centang produk berstatus{" "}
                  <strong className="text-zinc-300 uppercase">{eligibleStatus}</strong> di bawah.
                </span>
              </div>
            )}
          </div>

          {/* Product Filter & Picker */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-zinc-300 font-semibold">
                Daftar Produk ({filteredProducts.length} memenuhi syarat)
              </Label>
              {filteredProducts.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllVisible}
                  className="h-6 text-[11px] px-2 text-zinc-400 hover:text-zinc-200 gap-1"
                >
                  {filteredProducts.every((p) => selectedProductIds.includes(p.product_id)) ? (
                    <>
                      <CheckSquare className="size-3 text-amber-400" />
                      <span>Batal Pilih Semua</span>
                    </>
                  ) : (
                    <>
                      <Square className="size-3" />
                      <span>Pilih Semua yang Ditampilkan</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Filter row: Search & Client dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-3.5 text-zinc-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari No. Seri / Nama / Kode..."
                  className="pl-8 h-8 text-xs bg-zinc-900 border-zinc-800 rounded-xl text-zinc-100"
                />
              </div>

              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 size-3.5 text-zinc-500" />
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full pl-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 pr-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Semua Perusahaan / Client</option>
                  {uniqueClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Items List */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-800/60 max-h-56 overflow-y-auto">
              {loading ? (
                <div className="p-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
                  <Loader2 className="size-4 animate-spin text-amber-400" />
                  <span>Memuat daftar produk...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  Tidak ada produk berstatus{" "}
                  <strong className="text-zinc-400 uppercase">{eligibleStatus}</strong> yang cocok.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isChecked = selectedProductIds.includes(p.product_id);
                  return (
                    <div
                      key={p.product_id}
                      onClick={() => toggleSelectProduct(p.product_id)}
                      className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                        isChecked ? "bg-amber-500/10 hover:bg-amber-500/15" : "hover:bg-zinc-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelectProduct(p.product_id)}
                          className="border-zinc-700 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-zinc-200 truncate">
                              {p.serial_number || p.product_code || "Tanpa Serial"}
                            </span>
                            {p.product_code && p.serial_number && (
                              <span className="text-[10px] font-mono text-zinc-500 truncate">
                                ({p.product_code})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {p.product_name || "Produk Tanpa Nama"}
                            {p.client?.client_name ? ` • ${p.client.client_name}` : ""}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono px-1.5 py-0.5 border ${
                          p.status === "pending"
                            ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                            : p.status === "warranty"
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                            : "border-zinc-700 text-zinc-400 bg-zinc-800/40"
                        }`}
                      >
                        {p.status}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </form>

        <DialogFooter className="p-4 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between sm:justify-between">
          <span className="text-xs text-zinc-400">
            Total <strong className="text-zinc-200 font-mono">{selectedProductIds.length}</strong>{" "}
            produk dipilih
          </span>
          <div className="flex items-center gap-2">
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
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || selectedProductIds.length === 0}
              className="bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 rounded-xl text-xs gap-1.5 shadow-sm"
            >
              {submitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5 stroke-[2.5]" />
              )}
              <span>{isScheduled ? "Jadwalkan Event" : "Buat & Mulai Event"}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
