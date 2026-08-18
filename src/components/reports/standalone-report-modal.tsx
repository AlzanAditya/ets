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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  FileText,
  Image as ImageIcon,
  Upload,
  Trash2,
  Plus,
  Send,
  Save,
  X,
  FileArchive,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { reportsService } from "@/services/reports.service";
import type { ReportTypeRow } from "@/types/database";
import { DynamicReportForm } from "./dynamic-report-form";

interface StandaloneReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultReportTypeCode?: string;
  onReportCreated?: () => void;
}

interface EventOption {
  event_id: string;
  title: string;
  event_type: string;
  created_at: string;
  product_name?: string;
  serial_number?: string;
}

export function StandaloneReportModal({
  open,
  onOpenChange,
  defaultReportTypeCode,
  onReportCreated,
}: StandaloneReportModalProps) {
  const [reportTypes, setReportTypes] = React.useState<ReportTypeRow[]>([]);
  const [loadingTypes, setLoadingTypes] = React.useState(false);
  const [selectedTypeId, setSelectedTypeId] = React.useState<string>("");

  // Event selection
  const [events, setEvents] = React.useState<EventOption[]>([]);
  const [loadingEvents, setLoadingEvents] = React.useState(false);
  const [selectedEventId, setSelectedEventId] = React.useState<string>("");
  const [eventSearch, setEventSearch] = React.useState("");

  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [pendingImageFiles, setPendingImageFiles] = React.useState<
    Array<{ file: File; previewUrl: string; caption: string }>
  >([]);
  const [pendingDocFiles, setPendingDocFiles] = React.useState<File[]>([]);

  const [saving, setSaving] = React.useState(false);
  const [statusAction, setStatusAction] = React.useState<"draft" | "submitted">("draft");

  // Load report types & recent events when opened
  React.useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        setLoadingTypes(true);
        setLoadingEvents(true);

        const types = await reportsService.getReportTypes();
        setReportTypes(types);

        if (defaultReportTypeCode) {
          const match = types.find(
            (t) =>
              t.code.toLowerCase() === defaultReportTypeCode.toLowerCase() ||
              t.name.toLowerCase() === defaultReportTypeCode.toLowerCase()
          );
          if (match) {
            setSelectedTypeId(match.report_type_id);
          } else if (types.length > 0) {
            setSelectedTypeId(types[0].report_type_id);
          }
        } else if (types.length > 0 && !selectedTypeId) {
          setSelectedTypeId(types[0].report_type_id);
        }

        // Fetch recent active events joined with product info
        const { data: dbEvents, error: evErr } = await (supabase as any)
          .from("product_events")
          .select(`
            event_id,
            title,
            event_type,
            created_at,
            event_products(
              product_id,
              products(
                name,
                serial_number
              )
            )
          `)
          .order("created_at", { ascending: false })
          .limit(30);

        if (!evErr && dbEvents) {
          const formatted: EventOption[] = dbEvents.map((ev: any) => {
            const firstProd = ev.event_products?.[0]?.products;
            return {
              event_id: ev.event_id,
              title: ev.title || "Event Operasional",
              event_type: ev.event_type || "event",
              created_at: ev.created_at,
              product_name: firstProd?.name || undefined,
              serial_number: firstProd?.serial_number || undefined,
            };
          });
          setEvents(formatted);
          if (formatted.length > 0 && !selectedEventId) {
            setSelectedEventId(formatted[0].event_id);
          }
        }
      } catch (err) {
        console.error("Failed to load initial standalone modal data:", err);
      } finally {
        setLoadingTypes(false);
        setLoadingEvents(false);
      }
    };

    loadData();

    // Reset fields
    setFormData({});
    setPendingImageFiles([]);
    setPendingDocFiles([]);
    setEventSearch("");
  }, [open, defaultReportTypeCode]);

  const selectedType = React.useMemo(() => {
    return reportTypes.find((t) => t.report_type_id === selectedTypeId) || reportTypes[0];
  }, [reportTypes, selectedTypeId]);

  const hasData = selectedType ? selectedType.has_data !== false : true;
  const hasImages = selectedType ? selectedType.has_images !== false : true;
  const hasFiles = selectedType ? selectedType.has_files !== false : true;

  // Filtered events
  const filteredEvents = React.useMemo(() => {
    if (!eventSearch.trim()) return events;
    const query = eventSearch.toLowerCase();
    return events.filter(
      (ev) =>
        ev.title.toLowerCase().includes(query) ||
        ev.product_name?.toLowerCase().includes(query) ||
        ev.serial_number?.toLowerCase().includes(query)
    );
  }, [events, eventSearch]);

  // Handle local image picker
  const handlePickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems = Array.from(files).map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      caption: "",
    }));

    setPendingImageFiles((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const removePendingImage = (index: number) => {
    setPendingImageFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Handle local document picker
  const handlePickDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setPendingDocFiles((prev) => [...prev, ...Array.from(files)]);
    e.target.value = "";
  };

  const removePendingDoc = (index: number) => {
    setPendingDocFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSave = async (statusToSet: "draft" | "submitted") => {
    if (!selectedEventId) {
      toast.error("Pilih target event/produk terlebih dahulu.");
      return;
    }
    if (!selectedTypeId) {
      toast.error("Pilih tipe laporan terlebih dahulu.");
      return;
    }

    try {
      setSaving(true);
      setStatusAction(statusToSet);

      const created = await reportsService.createReport({
        event_id: selectedEventId,
        report_type_id: selectedTypeId,
        data: hasData ? formData : {},
        status: statusToSet,
      });

      const activeReportId = created.report_id;

      // Upload pending images if any
      if (hasImages && pendingImageFiles.length > 0) {
        const toastId = toast.loading("Mengunggah foto laporan...");
        await reportsService.uploadReportImages(
          selectedEventId,
          activeReportId,
          pendingImageFiles.map((p) => p.file)
        );
        toast.success("Foto laporan berhasil diunggah", { id: toastId });
      }

      // Upload pending files if any
      if (hasFiles && pendingDocFiles.length > 0) {
        const toastId = toast.loading("Mengunggah berkas lampiran...");
        await reportsService.uploadReportFiles(
          selectedEventId,
          activeReportId,
          pendingDocFiles
        );
        toast.success("Berkas lampiran berhasil diunggah", { id: toastId });
      }

      toast.success(
        statusToSet === "submitted"
          ? "Laporan berhasil diterbitkan!"
          : "Draf laporan berhasil disimpan!"
      );

      onOpenChange(false);
      onReportCreated?.();
    } catch (err: any) {
      console.error("Error saving standalone report:", err);
      toast.error(err.message || "Gagal menyimpan laporan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100 rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 border-b border-zinc-800/80 bg-zinc-900/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <FileText className="size-5 text-amber-400" />
                <span>Buat Dokumen Laporan Operasional</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Pilih jenis laporan, tautkan ke event/produk, lengkapi formulir dan lampiran.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
          {/* 1. Report Type Selector Chips */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-200">Jenis Dokumen Laporan</Label>
            {loadingTypes ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500 py-1">
                <Loader2 className="size-3.5 animate-spin text-amber-500" />
                <span>Memuat format dokumen...</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {reportTypes.map((type) => {
                  const isSelected = type.report_type_id === selectedTypeId;
                  return (
                    <button
                      key={type.report_type_id}
                      type="button"
                      onClick={() => setSelectedTypeId(type.report_type_id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-500 text-zinc-950 border-amber-500 shadow-sm"
                          : "bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      {type.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Target Event & Product Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-200">
              Pilih Target Event / Unit Produk
            </Label>

            {events.length > 5 && (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-3.5 text-zinc-500" />
                <Input
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder="Cari event atau nomor seri produk..."
                  className="pl-8 h-8 text-xs bg-zinc-900 border-zinc-800 text-zinc-100 rounded-xl"
                />
              </div>
            )}

            <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-1.5 space-y-1">
              {loadingEvents ? (
                <div className="p-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="size-3.5 animate-spin text-amber-500" />
                  <span>Memuat event aktif...</span>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500">
                  Tidak ditemukan event yang sesuai.
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const isSelected = ev.event_id === selectedEventId;
                  return (
                    <div
                      key={ev.event_id}
                      onClick={() => setSelectedEventId(ev.event_id)}
                      className={`p-2 rounded-lg cursor-pointer flex items-center justify-between gap-2 border transition-all ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                          : "bg-zinc-900/40 border-transparent hover:bg-zinc-800/60 text-zinc-300"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate flex items-center gap-1.5">
                          <span>{ev.title}</span>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">
                            ({ev.event_type})
                          </span>
                        </p>
                        {ev.product_name && (
                          <p className="text-[10px] text-zinc-400 truncate">
                            Unit: {ev.product_name} {ev.serial_number && `(${ev.serial_number})`}
                          </p>
                        )}
                      </div>

                      <div className="text-[10px] font-mono text-zinc-500 shrink-0">
                        {ev.created_at ? new Date(ev.created_at).toLocaleDateString("id-ID") : ""}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Form Data Section */}
          {hasData && (
            <div className="space-y-3 pt-1 border-t border-zinc-800/80">
              <Label className="text-xs font-semibold text-zinc-200">Data & Catatan Laporan</Label>
              <DynamicReportForm
                fieldSchema={selectedType?.field_schema}
                value={formData}
                onChange={setFormData}
              />
            </div>
          )}

          {/* 4. Multi-Images Upload Section */}
          {hasImages && (
            <div className="space-y-3 pt-1 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <ImageIcon className="size-3.5 text-amber-400" />
                  <span>Foto Dokumentasi Lapangan ({pendingImageFiles.length})</span>
                </Label>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-xs font-semibold text-amber-400 transition-colors shadow-xs">
                  <Plus className="size-3.5" />
                  <span>Tambah Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePickImages}
                  />
                </label>
              </div>

              {pendingImageFiles.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {pendingImageFiles.map((p, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square rounded-xl border border-amber-500/30 bg-zinc-900 overflow-hidden"
                    >
                      <img
                        src={p.previewUrl}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePendingImage(idx)}
                        className="absolute top-1 right-1 size-6 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center transition-all"
                        title="Hapus"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center text-xs text-zinc-500">
                  Belum ada foto yang dipilih.
                </div>
              )}
            </div>
          )}

          {/* 5. Document Attachments Section */}
          {hasFiles && (
            <div className="space-y-3 pt-1 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <FileArchive className="size-3.5 text-blue-400" />
                  <span>Berkas Lampiran PDF / Dokumen ({pendingDocFiles.length})</span>
                </Label>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 text-xs font-semibold text-blue-400 transition-colors shadow-xs">
                  <Upload className="size-3.5" />
                  <span>Unggah Berkas</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    multiple
                    className="hidden"
                    onChange={handlePickDocs}
                  />
                </label>
              </div>

              {pendingDocFiles.length > 0 ? (
                <div className="space-y-1.5">
                  {pendingDocFiles.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="size-4 text-blue-400 shrink-0" />
                        <span className="text-xs text-zinc-200 truncate">{doc.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ({(doc.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePendingDoc(idx)}
                        className="text-zinc-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center text-xs text-zinc-500">
                  Belum ada berkas PDF / dokumen yang dipilih.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 sm:p-6 border-t border-zinc-800/80 bg-zinc-900/40 flex flex-row items-center justify-between sm:justify-between gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="text-zinc-400 hover:text-zinc-100 rounded-xl"
          >
            Batal
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl gap-1.5"
            >
              {saving && statusAction === "draft" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              <span>Simpan Draf</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSave("submitted")}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-xl gap-1.5"
            >
              {saving && statusAction === "submitted" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              <span>Terbitkan Laporan</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
