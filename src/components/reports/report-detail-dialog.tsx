import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  Image as ImageIcon,
  FileArchive,
  Download,
  Printer,
  Tag,
  CheckCircle2,
  Clock,
  User,
} from "lucide-react";
import type { ReportWithRelations } from "@/services/reports.service";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";

interface ReportDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportWithRelations | null;
  eventTitle?: string;
  productName?: string;
  onEdit?: (report: ReportWithRelations) => void;
}

export function ReportDetailDialog({
  open,
  onOpenChange,
  report,
  eventTitle,
  productName,
  onEdit,
}: ReportDetailDialogProps) {
  const [lightboxState, setLightboxState] = React.useState<{
    isOpen: boolean;
    images: LightboxImage[];
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });

  if (!report) return null;

  const isSubmitted = report.status === "submitted";
  const typeName = report.report_type?.name || "Laporan Operasional";

  const openImagesLightbox = (initialIdx: number) => {
    if (!report.images || report.images.length === 0) return;
    const imgs: LightboxImage[] = report.images.map((img, i) => ({
      id: img.report_image_id,
      url: img.publicUrl || img.thumbUrl,
      title: `${typeName} - Foto ${i + 1}`,
      storage_path: img.storage_path,
    }));
    setLightboxState({
      isOpen: true,
      images: imgs,
      currentIndex: initialIdx,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const reportData = (report.data as Record<string, any>) || {};
  const dataEntries = Object.entries(reportData).filter(
    ([k]) => k !== "notes" && k !== "summary"
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100 rounded-2xl shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-5 sm:p-6 border-b border-zinc-800/80 bg-zinc-900/50 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-lg flex items-center gap-1.5"
                  >
                    <Tag className="size-3" />
                    <span>{typeName}</span>
                  </Badge>

                  <Badge
                    variant="outline"
                    className={
                      isSubmitted
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1"
                    }
                  >
                    {isSubmitted ? (
                      <>
                        <CheckCircle2 className="size-3" />
                        <span>Submitted</span>
                      </>
                    ) : (
                      <>
                        <Clock className="size-3" />
                        <span>Draft</span>
                      </>
                    )}
                  </Badge>
                </div>

                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <FileText className="size-5 text-amber-400" />
                  <span>Detail Dokumen Laporan</span>
                </DialogTitle>

                <DialogDescription className="text-xs text-zinc-400">
                  ID: <span className="font-mono text-zinc-300">{report.report_id}</span>
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 text-xs font-medium border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl gap-1.5"
                >
                  <Printer className="size-3.5" />
                  <span className="hidden sm:inline">Cetak</span>
                </Button>

                {onEdit && !isSubmitted && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onEdit(report);
                    }}
                    className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl"
                  >
                    Edit Draf
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
            {/* Meta context card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <div className="space-y-1">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Terkait Event / Proyek
                </span>
                <p className="text-xs font-semibold text-zinc-200">
                  {eventTitle || `Event ID: ${report.event_id.slice(0, 8)}...`}
                </p>
                {productName && (
                  <p className="text-[11px] text-amber-400/90 font-mono">
                    Unit: {productName}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Waktu & Pembuat
                </span>
                <p className="text-xs text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-zinc-400" />
                  <span>
                    {report.created_at
                      ? new Date(report.created_at).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "-"}
                  </span>
                </p>
                {report.created_by && (
                  <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <User className="size-3" />
                    <span className="truncate">{report.created_by}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Notes / Summary Section */}
            {(reportData.notes || reportData.summary) && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Catatan / Ringkasan Pekerjaan
                </h4>
                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {reportData.notes || reportData.summary}
                </div>
              </div>
            )}

            {/* Dynamic Structured Fields Data */}
            {dataEntries.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Data Rincian Dokumen
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {dataEntries.map(([k, v]) => (
                    <div
                      key={k}
                      className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between"
                    >
                      <span className="text-[10px] uppercase font-mono text-zinc-400 font-semibold">
                        {k.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs font-medium text-zinc-100 mt-0.5 break-words">
                        {typeof v === "boolean" ? (v ? "Ya / Selesai" : "Tidak") : String(v || "-")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Images Gallery */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <ImageIcon className="size-3.5 text-amber-400" />
                  <span>Foto Dokumentasi Lapangan ({report.images?.length || 0})</span>
                </h4>
              </div>

              {report.images && report.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {report.images.map((img, idx) => (
                    <div
                      key={img.report_image_id}
                      onClick={() => openImagesLightbox(idx)}
                      className="group relative aspect-square rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden cursor-pointer hover:border-amber-500/60 transition-all shadow-xs"
                    >
                      <img
                        src={img.thumbUrl || img.publicUrl}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-1 rounded-md">
                          Perbesar
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center text-xs text-zinc-500">
                  Tidak ada foto dokumentasi terlampir.
                </div>
              )}
            </div>

            {/* Document Files Attachments */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <FileArchive className="size-3.5 text-blue-400" />
                <span>Berkas Lampiran PDF / Dokumen ({report.files?.length || 0})</span>
              </h4>

              {report.files && report.files.length > 0 ? (
                <div className="space-y-2">
                  {report.files.map((file) => (
                    <div
                      key={file.report_file_id}
                      className="p-2.5 sm:p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-200 truncate">
                            {file.file_name || "Dokumen Lampiran"}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono">
                            {file.file_size
                              ? `${(file.file_size / 1024).toFixed(1)} KB`
                              : "PDF/Document"}
                          </p>
                        </div>
                      </div>

                      <a
                        href={file.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-100 transition-colors shrink-0"
                      >
                        <Download className="size-3.5" />
                        <span className="hidden sm:inline">Unduh / Buka</span>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 text-center text-xs text-zinc-500">
                  Tidak ada berkas lampiran terlampir.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
      <ImageLightbox
        isOpen={lightboxState.isOpen}
        images={lightboxState.images}
        currentIndex={lightboxState.currentIndex}
        onNavigate={(newIndex) =>
          setLightboxState((prev) => ({ ...prev, currentIndex: newIndex }))
        }
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
