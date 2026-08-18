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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  FileText,
  Image as ImageIcon,
  FileCheck,
  Upload,
  Trash2,
  Plus,
  Send,
  Save,
  X,
  FileArchive,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  reportsService,
  type ReportWithRelations,
  type ReportImageWithUrl,
  type ReportFileWithUrl,
} from "@/services/reports.service";
import type { ReportTypeRow } from "@/types/database";
import { DynamicReportForm } from "./dynamic-report-form";

interface EventReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  report?: ReportWithRelations | null; // If editing existing report
  onSaved?: (savedReport: ReportWithRelations) => void;
}

export function EventReportModal({
  open,
  onOpenChange,
  eventId,
  report,
  onSaved,
}: EventReportModalProps) {
  const isEdit = Boolean(report && report.report_id);

  const [reportTypes, setReportTypes] = React.useState<ReportTypeRow[]>([]);
  const [loadingTypes, setLoadingTypes] = React.useState(false);
  const [selectedTypeId, setSelectedTypeId] = React.useState<string>("");

  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [existingImages, setExistingImages] = React.useState<ReportImageWithUrl[]>([]);
  const [existingFiles, setExistingFiles] = React.useState<ReportFileWithUrl[]>([]);

  const [pendingImageFiles, setPendingImageFiles] = React.useState<Array<{ file: File; previewUrl: string; caption: string }>>([]);
  const [pendingDocFiles, setPendingDocFiles] = React.useState<File[]>([]);

  const [saving, setSaving] = React.useState(false);
  const [statusAction, setStatusAction] = React.useState<"draft" | "submitted">("draft");

  // Load report types on modal open
  React.useEffect(() => {
    if (!open) return;

    const fetchTypes = async () => {
      try {
        setLoadingTypes(true);
        const types = await reportsService.getReportTypes();
        setReportTypes(types);

        if (report?.report_type_id) {
          setSelectedTypeId(report.report_type_id);
        } else if (types.length > 0 && !selectedTypeId) {
          setSelectedTypeId(types[0].report_type_id);
        }
      } catch (err) {
        console.error("Failed to load report types:", err);
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchTypes();

    if (report) {
      setFormData((report.data as Record<string, any>) || {});
      setExistingImages(report.images || []);
      setExistingFiles(report.files || []);
    } else {
      setFormData({});
      setExistingImages([]);
      setExistingFiles([]);
    }

    setPendingImageFiles([]);
    setPendingDocFiles([]);
  }, [open, report]);

  const selectedType = React.useMemo(() => {
    return reportTypes.find((t) => t.report_type_id === selectedTypeId) || null;
  }, [reportTypes, selectedTypeId]);

  const hasData = selectedType?.has_data ?? true;
  const hasImages = selectedType?.has_images ?? false;
  const hasFiles = selectedType?.has_files ?? false;

  // Handle Image Selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPending = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      caption: "",
    }));

    setPendingImageFiles((prev) => [...prev, ...newPending]);
    e.target.value = "";
  };

  const handleRemovePendingImage = (idx: number) => {
    setPendingImageFiles((prev) => {
      const item = prev[idx];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDeleteExistingImage = async (imageId: string) => {
    if (!report?.report_id) return;
    try {
      await reportsService.deleteReportImage(imageId);
      setExistingImages((prev) => prev.filter((img) => img.report_image_id !== imageId));
      toast.success("Foto laporan dihapus");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus foto");
    }
  };

  // Handle Document Files Selection
  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPendingDocFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemovePendingDoc = (idx: number) => {
    setPendingDocFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDeleteExistingFile = async (fileId: string) => {
    if (!report?.report_id) return;
    try {
      await reportsService.deleteReportFile(fileId);
      setExistingFiles((prev) => prev.filter((f) => f.report_file_id !== fileId));
      toast.success("Dokumen dihapus");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus dokumen");
    }
  };

  // Submit / Save handler
  const handleSave = async (statusToSet: "draft" | "submitted") => {
    if (!selectedTypeId) {
      toast.error("Pilih jenis laporan terlebih dahulu");
      return;
    }

    // Validation for 'submitted' status
    if (statusToSet === "submitted") {
      if (hasImages && existingImages.length === 0 && pendingImageFiles.length === 0) {
        toast.error("Laporan jenis ini mewajibkan minimal 1 foto sebelum diserahkan");
        return;
      }
      if (hasFiles && existingFiles.length === 0 && pendingDocFiles.length === 0) {
        toast.error("Laporan jenis ini mewajibkan dokumen/file terlampir sebelum diserahkan");
        return;
      }
    }

    try {
      setSaving(true);
      setStatusAction(statusToSet);

      let activeReportId = report?.report_id;

      if (isEdit && activeReportId) {
        await reportsService.updateReport(activeReportId, {
          data: hasData ? formData : {},
          status: statusToSet,
        });
      } else {
        const created = await reportsService.createReport({
          event_id: eventId,
          report_type_id: selectedTypeId,
          data: hasData ? formData : {},
          status: statusToSet,
        });
        activeReportId = created.report_id;
      }

      if (!activeReportId) {
        throw new Error("Gagal mengidentifikasi ID Laporan.");
      }

      // Upload pending images if any
      if (hasImages && pendingImageFiles.length > 0) {
        const toastId = "upload-report-imgs";
        toast.loading(`Mengunggah & mengonversi ${pendingImageFiles.length} foto ke WebP...`, { id: toastId });
        await reportsService.uploadReportImages(
          eventId,
          activeReportId,
          pendingImageFiles.map((p) => p.file)
        );
        toast.success("Foto laporan berhasil diunggah", { id: toastId });
      }

      // Upload pending document files if any
      if (hasFiles && pendingDocFiles.length > 0) {
        const toastId = "upload-report-docs";
        toast.loading(`Mengunggah ${pendingDocFiles.length} berkas lampiran...`, { id: toastId });
        await reportsService.uploadReportFiles(
          eventId,
          activeReportId,
          pendingDocFiles
        );
        toast.success("Berkas lampiran berhasil diunggah", { id: toastId });
      }

      // Re-fetch latest report with relations
      const fullReport = await reportsService.getReportById(activeReportId);
      if (fullReport) {
        onSaved?.(fullReport);
      }

      toast.success(
        statusToSet === "submitted"
          ? "Laporan berhasil diselesaikan & dikirim!"
          : "Laporan berhasil disimpan sebagai Draft"
      );
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to save report:", err);
      toast.error(err.message || "Gagal menyimpan laporan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-wider">
            <FileText className="size-4" />
            <span>Operational Reports</span>
          </div>
          <DialogTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <span>{isEdit ? "Edit Laporan Operasional" : "Buat Laporan Baru"}</span>
            {selectedType && (
              <Badge
                variant="outline"
                className="text-xs font-mono border-amber-500/40 text-amber-300 bg-amber-500/10"
              >
                {selectedType.name}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Isi formulir dan lampirkan foto atau dokumen sesuai dengan ketentuan jenis laporan ini.
          </DialogDescription>
        </DialogHeader>

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Report Type Selector (only enabled if new report or not submitted) */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-300 font-semibold flex items-center justify-between">
              <span>Jenis Laporan</span>
              {selectedType && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 font-normal">
                  <span>Komponen:</span>
                  <span className={hasData ? "text-emerald-400" : "text-zinc-600 line-through"}>Data</span>
                  <span>•</span>
                  <span className={hasImages ? "text-emerald-400" : "text-zinc-600 line-through"}>Foto</span>
                  <span>•</span>
                  <span className={hasFiles ? "text-emerald-400" : "text-zinc-600 line-through"}>Berkas</span>
                </div>
              )}
            </Label>

            {loadingTypes ? (
              <div className="h-10 rounded-xl bg-zinc-900 animate-pulse" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {reportTypes.map((rt) => {
                  const isSelected = rt.report_type_id === selectedTypeId;
                  return (
                    <button
                      key={rt.report_type_id}
                      type="button"
                      disabled={isEdit && report?.status === "submitted"}
                      onClick={() => setSelectedTypeId(rt.report_type_id)}
                      className={`p-2.5 rounded-xl border text-left transition-all select-none flex flex-col justify-between ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/15 text-amber-200 shadow-sm"
                          : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-300"
                      }`}
                    >
                      <span className="text-xs font-bold leading-snug">{rt.name}</span>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-500 font-mono">
                        {rt.has_data && <span>Data</span>}
                        {rt.has_images && <span>+Foto</span>}
                        {rt.has_files && <span>+Doc</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 1: Dynamic Data Form (Rendered ONLY if has_data = true) */}
          {hasData && (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs border-b border-zinc-800/60 pb-2">
                <FileText className="size-4 text-amber-400" />
                <span>Formulir & Data Laporan</span>
              </div>
              <DynamicReportForm
                fieldSchema={selectedType?.field_schema}
                value={formData}
                onChange={setFormData}
                disabled={report?.status === "submitted"}
              />
            </div>
          )}

          {/* SECTION 2: Dynamic Images Upload (Rendered ONLY if has_images = true) */}
          {hasImages && (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs">
                  <ImageIcon className="size-4 text-amber-400" />
                  <span>Dokumentasi Foto (Otomatis WebP + Thumbnail)</span>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Total: {existingImages.length + pendingImageFiles.length} foto
                </span>
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                {/* Existing uploaded images */}
                {existingImages.map((img) => (
                  <div
                    key={img.report_image_id}
                    className="group relative aspect-square rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
                  >
                    <img
                      src={img.thumbUrl || img.publicUrl}
                      alt={img.file_name || "Foto Laporan"}
                      className="h-full w-full object-cover"
                    />
                    {report?.status !== "submitted" && (
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingImage(img.report_image_id)}
                        className="absolute top-1 right-1 size-6 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                        title="Hapus foto"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Pending new images */}
                {pendingImageFiles.map((p, idx) => (
                  <div
                    key={`pending-img-${idx}`}
                    className="group relative aspect-square rounded-xl border border-amber-500/40 bg-zinc-900 overflow-hidden"
                  >
                    <img
                      src={p.previewUrl}
                      alt={`Pending ${idx + 1}`}
                      className="h-full w-full object-cover opacity-80"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 py-0.5 px-1 text-[9px] text-amber-300 font-mono truncate text-center">
                      Siap Unggah
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePendingImage(idx)}
                      className="absolute top-1 right-1 size-6 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center transition-all"
                      title="Batalkan"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}

                {/* Upload Picker Button */}
                {report?.status !== "submitted" && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-800 hover:border-amber-500/50 bg-zinc-900/30 hover:bg-zinc-900/60 flex flex-col items-center justify-center cursor-pointer transition-all">
                    <Plus className="size-5 text-zinc-400 group-hover:text-amber-400" />
                    <span className="text-[10px] font-medium text-zinc-400 mt-1">Upload Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={handleImageSelect}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: Dynamic Document Files Upload (Rendered ONLY if has_files = true) */}
          {hasFiles && (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs">
                  <FileArchive className="size-4 text-amber-400" />
                  <span>Berkas & Dokumen Lampiran (PDF / Docx / Xlsx)</span>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Total: {existingFiles.length + pendingDocFiles.length} berkas
                </span>
              </div>

              {/* Files List */}
              <div className="space-y-2">
                {/* Existing uploaded files */}
                {existingFiles.map((f) => (
                  <div
                    key={f.report_file_id}
                    className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCheck className="size-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-medium text-zinc-200 truncate">
                          {f.file_name}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          {f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : "Dokumen terlampir"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={f.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-amber-400 hover:underline px-2 py-1"
                      >
                        Buka
                      </a>
                      {report?.status !== "submitted" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingFile(f.report_file_id)}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Pending files */}
                {pendingDocFiles.map((pf, idx) => (
                  <div
                    key={`pending-doc-${idx}`}
                    className="p-2.5 rounded-xl bg-zinc-900/80 border border-amber-500/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Upload className="size-4 text-amber-400 shrink-0 animate-bounce" />
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-medium text-zinc-200 truncate">
                          {pf.name}
                        </p>
                        <p className="text-[10px] text-amber-400/80 font-mono">
                          Siap diunggah • {(pf.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePendingDoc(idx)}
                      className="text-zinc-500 hover:text-rose-400 p-1"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add File Button */}
                {report?.status !== "submitted" && (
                  <label className="p-3 rounded-xl border border-dashed border-zinc-800 hover:border-amber-500/50 bg-zinc-900/20 hover:bg-zinc-900/40 flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs text-zinc-400 hover:text-zinc-200">
                    <Plus className="size-4 text-amber-400" />
                    <span>Pilih Berkas PDF / Dokumen untuk Dilampirkan</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      multiple
                      className="sr-only"
                      onChange={handleDocSelect}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Info className="size-3.5 text-amber-400" />
            <span>
              Status: <strong className="font-mono text-zinc-200">{report?.status || "Draft"}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 rounded-xl text-xs"
            >
              Batal
            </Button>

            {/* Simpan Sebagai Draft */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="border-amber-500/30 bg-zinc-900 text-amber-300 hover:bg-amber-500/10 rounded-xl text-xs gap-1.5"
            >
              {saving && statusAction === "draft" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              <span>Simpan Draft</span>
            </Button>

            {/* Kirim / Selesaikan Laporan */}
            <Button
              type="button"
              size="sm"
              onClick={() => handleSave("submitted")}
              disabled={saving}
              className="bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400 rounded-xl text-xs gap-1.5 shadow-sm"
            >
              {saving && statusAction === "submitted" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              <span>Kirim / Selesaikan Laporan</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
