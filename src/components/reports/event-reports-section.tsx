import * as React from "react";
import {
  FileText,
  Plus,
  Loader2,
  Calendar,
  CheckCircle2,
  Clock,
  Paperclip,
  Image as ImageIcon,
  Edit2,
  Trash2,
  Download,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  reportsService,
  type ReportWithRelations,
} from "@/services/reports.service";
import { EventReportModal } from "./event-report-modal";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EventReportsSectionProps {
  eventId: string;
  isReadOnly?: boolean;
}

export function EventReportsSection({
  eventId,
  isReadOnly = false,
}: EventReportsSectionProps) {
  const [reports, setReports] = React.useState<ReportWithRelations[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<ReportWithRelations | null>(null);

  // Delete State
  const [reportToDelete, setReportToDelete] = React.useState<ReportWithRelations | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Lightbox State
  const [lightboxState, setLightboxState] = React.useState<{
    isOpen: boolean;
    images: LightboxImage[];
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });

  const loadReports = React.useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const data = await reportsService.getReportsByEvent(eventId);
      setReports(data);
    } catch (err) {
      console.error("Failed to load reports for event:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  React.useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleOpenCreate = () => {
    setSelectedReport(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (rep: ReportWithRelations) => {
    setSelectedReport(rep);
    setModalOpen(true);
  };

  const executeDeleteReport = async () => {
    if (!reportToDelete) return;
    try {
      setDeleting(true);
      await reportsService.deleteReport(reportToDelete.report_id);
      setReports((prev) => prev.filter((r) => r.report_id !== reportToDelete.report_id));
      toast.success("Laporan berhasil dihapus");
    } catch (err: any) {
      console.error("Failed to delete report:", err);
      toast.error(err.message || "Gagal menghapus laporan");
    } finally {
      setDeleting(false);
      setReportToDelete(null);
    }
  };

  const openImagesLightbox = (images: ReportWithRelations["images"], initialIdx: number, reportTitle: string) => {
    const lightboxImgs: LightboxImage[] = images.map((img, i) => ({
      id: img.report_image_id,
      url: img.publicUrl || img.thumbUrl,
      title: `${reportTitle} - Foto ${i + 1}`,
      storage_path: img.storage_path,
      thumbnail_path: img.thumbnail_path,
    }));

    setLightboxState({
      isOpen: true,
      images: lightboxImgs,
      currentIndex: initialIdx,
    });
  };

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-amber-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            Laporan Operasional ({reports.length})
          </h4>
        </div>

        {!isReadOnly && (
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-7 px-2.5 text-xs font-semibold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 gap-1.5 shadow-xs"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Tambah Laporan</span>
          </Button>
        )}
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="p-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <Loader2 className="size-4 animate-spin text-amber-400" />
          <span>Memuat laporan...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-5 rounded-xl border border-dashed border-zinc-800 text-center space-y-2">
          <p className="text-xs text-zinc-400">Belum ada laporan operasional yang dibuat untuk event ini.</p>
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCreate}
              className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 gap-1 rounded-lg"
            >
              <Plus className="size-3" />
              <span>Buat Laporan Pertama</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => {
            const typeName = rep.report_type?.name || "Laporan Umum";
            const isSubmitted = rep.status === "submitted";
            const dateStr = rep.created_at
              ? new Date(rep.created_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-";

            const dataObj = (rep.data as Record<string, any>) || {};
            const dataNotes = dataObj.notes || dataObj.summary || "";
            const dataEntries = Object.entries(dataObj).filter(
              ([k]) => k !== "notes" && k !== "summary"
            );

            return (
              <div
                key={rep.report_id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-3 transition-colors hover:border-zinc-700"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-100">{typeName}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono px-1.5 py-0.5 border ${
                          isSubmitted
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                            : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        }`}
                      >
                        {isSubmitted ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="size-2.5" /> Selesai / Terkirim
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="size-2.5" /> Draft
                          </span>
                        )}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                      <Calendar className="size-3 text-zinc-500" />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isReadOnly && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(rep)}
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg"
                        title="Edit Laporan"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReportToDelete(rep)}
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg"
                        title="Hapus Laporan"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Notes preview if any */}
                {dataNotes && (
                  <p className="text-xs text-zinc-300 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80 line-clamp-3">
                    {dataNotes}
                  </p>
                )}

                {/* Additional structured parameters */}
                {dataEntries.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                    {dataEntries.slice(0, 6).map(([k, v]) => (
                      <div
                        key={k}
                        className="p-1.5 rounded-md bg-zinc-900/40 border border-zinc-800/60 flex flex-col"
                      >
                        <span className="text-zinc-500 uppercase text-[9px] truncate">{k}</span>
                        <span className="text-zinc-200 font-medium truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Images Preview Grid */}
                {rep.images && rep.images.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                      <ImageIcon className="size-3 text-amber-400" />
                      <span>{rep.images.length} Foto Dokumentasi</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {rep.images.map((img, imgIdx) => (
                        <div
                          key={img.report_image_id}
                          onClick={() => openImagesLightbox(rep.images, imgIdx, typeName)}
                          className="size-14 shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden cursor-pointer hover:border-amber-500/60 transition-colors"
                        >
                          <img
                            src={img.thumbUrl || img.publicUrl}
                            alt="Foto Laporan"
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files Attachments */}
                {rep.files && rep.files.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                      <Paperclip className="size-3 text-emerald-400" />
                      <span>{rep.files.length} Berkas Lampiran</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {rep.files.map((file) => (
                        <a
                          key={file.report_file_id}
                          href={file.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 px-2.5 py-1 rounded-lg transition-colors group"
                        >
                          <Download className="size-3 text-zinc-400 group-hover:text-emerald-400" />
                          <span className="truncate max-w-[160px]">{file.file_name}</span>
                          <ExternalLink className="size-2.5 text-zinc-500" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Report Form Modal */}
      <EventReportModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        eventId={eventId}
        report={selectedReport}
        onSaved={() => {
          loadReports();
        }}
      />

      {/* Lightbox Modal */}
      <ImageLightbox
        isOpen={lightboxState.isOpen}
        images={lightboxState.images}
        currentIndex={lightboxState.currentIndex}
        canDelete={false}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
        onNavigate={(newIdx) => setLightboxState((prev) => ({ ...prev, currentIndex: newIdx }))}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={!!reportToDelete}
        onOpenChange={(open) => !open && !deleting && setReportToDelete(null)}
      >
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-zinc-100">Hapus Laporan ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-400">
              Laporan beserta seluruh foto dan dokumen terlampir akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 rounded-xl text-xs"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                executeDeleteReport();
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs"
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : "Hapus Laporan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
