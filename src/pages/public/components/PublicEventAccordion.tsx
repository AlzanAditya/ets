import * as React from "react";
import {
  Wrench,
  Check,
  ChevronDown,
  Loader2,
  Calendar,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportImages } from "@/lib/image-export";
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox";
import { cn } from "@/lib/utils";
import {
  productEventsService,
  deduplicateImages,
  type ProductEventData,
  type ProductStepImage,
  STEP_TYPE_TITLES,
} from "@/services/product-events.service";

interface PublicEventAccordionProps {
  productId: string;
  serialNumber: string;
}

export function PublicEventAccordion({
  productId,
  serialNumber,
}: PublicEventAccordionProps) {
  const [events, setEvents] = React.useState<ProductEventData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedEvents, setExpandedEvents] = React.useState<Record<string, boolean>>({});
  const [expandedSteps, setExpandedSteps] = React.useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = React.useState(3);

  // Lightbox state
  const [lightboxState, setLightboxState] = React.useState<{
    isOpen: boolean;
    images: LightboxImage[];
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });

  const loadEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await productEventsService.getProductEvents(productId);
      const sortedEvents = [...data].sort((a, b) => b.sequence_number - a.sequence_number);
      setEvents(sortedEvents);

      const initialEventState: Record<string, boolean> = {};
      const initialStepState: Record<string, boolean> = {};

      sortedEvents.forEach((evt, idx) => {
        initialEventState[evt.event_id] = idx === 0 || evt.status === "active";
        evt.steps.forEach((st) => {
          if (st.images.length > 0) {
            initialStepState[st.step_id] = true;
          }
        });
      });

      setExpandedEvents(initialEventState);
      setExpandedSteps(initialStepState);
    } catch (err) {
      console.error("Failed to load public events:", err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  React.useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const toggleEvent = (eventId: string) => {
    setExpandedEvents((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  // Export event images as ZIP
  const handleExportEventImages = async (evt: ProductEventData) => {
    const images = evt.steps.flatMap((step) =>
      step.images.map((img) => ({
        source: img.signedUrl || img.storage_path,
        fileName: img.file_name || undefined,
        context: {
          event: evt.title || evt.event_type,
          step: STEP_TYPE_TITLES[step.step_type] || step.title,
          productCode: "",
          serialNumber: serialNumber,
        },
      }))
    );

    if (images.length === 0) {
      toast.info("Tidak ada foto pada event ini.");
      return;
    }

    const toastId = toast.loading(`Mempersiapkan ${images.length} foto ${evt.title}...`);
    try {
      await exportImages({
        images,
        pipeline: ["convert:jpeg", "zip", "download"],
        jpegQuality: 0.9,
        zip: {
          name: `${serialNumber}_${evt.title}_Foto`,
          folderStrategy: "step",
        },
        fileNaming: {
          template: "{step}_{index}",
          indexPadding: 3,
        },
        onProgress: (p) => {
          if (p.stage === "fetching" || p.stage === "converting") {
            toast.loading(`Memproses foto (${p.currentFileIndex}/${p.totalFiles})...`, { id: toastId });
          } else if (p.stage === "zipping") {
            toast.loading(`Membuat ZIP (${p.percentage}%)...`, { id: toastId });
          } else if (p.stage === "downloading") {
            toast.loading("Memulai unduhan...", { id: toastId });
          }
        },
        onComplete: (res) => {
          if (res.success) {
            toast.success(`Berhasil mengunduh ${res.exportedCount} foto ${evt.title}`, { id: toastId });
          }
        },
        onError: (err) => {
          toast.error(`Gagal unduh foto: ${err.message}`, { id: toastId });
        },
      });
    } catch (err: any) {
      toast.error(`Gagal unduh foto: ${err?.message || err}`, { id: toastId });
    }
  };

  // Open Lightbox
  const openLightbox = (images: ProductStepImage[], initialIdx: number, stepTitle: string) => {
    const lightboxImages: LightboxImage[] = images.map((img, i) => ({
      id: img.id,
      url: img.signedUrl || img.thumbnail_path || img.storage_path,
      title: `${stepTitle} - Foto ${i + 1}`,
    }));

    setLightboxState({
      isOpen: true,
      images: lightboxImages,
      currentIndex: initialIdx,
    });
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 text-sm text-zinc-400">
        <Loader2 className="size-5 animate-spin text-emerald-500" />
        <span>Memuat dokumentasi produk...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center bg-zinc-900/40">
        <p className="text-sm text-zinc-400">Belum ada dokumentasi event tercatat untuk produk ini.</p>
      </div>
    );
  }

  const visibleEvents = events.slice(0, visibleCount);
  const hasMoreEvents = visibleCount < events.length;

  return (
    <div className="space-y-4">
      {visibleEvents.map((evt) => {
        const isEventExpanded = !!expandedEvents[evt.event_id];
        const isEventCompleted = evt.status === "completed";
        const totalPhotos = evt.steps.reduce((acc, s) => acc + s.images.length, 0);

        const eventDateDisplay = isEventCompleted && evt.completed_at
          ? new Date(evt.completed_at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : null;

        return (
          <div
            key={evt.event_id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/90 text-zinc-100 overflow-hidden shadow-lg transition-all"
          >
            {/* Main Event Header */}
            <div
              onClick={() => toggleEvent(evt.event_id)}
              className={cn(
                "flex items-center justify-between p-4 cursor-pointer select-none transition-colors",
                isEventExpanded ? "bg-zinc-900 border-b border-zinc-800" : "hover:bg-zinc-800/60"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-xl font-semibold transition-colors",
                    isEventCompleted
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  )}
                >
                  {isEventCompleted ? (
                    <Check className="size-4 stroke-[3]" />
                  ) : (
                    <Wrench className="size-4 animate-pulse text-amber-400" />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold tracking-wider uppercase text-zinc-100">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">
                    {isEventCompleted ? "Event Selesai & Terverifikasi" : "Dalam Proses Pengerjaan"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {totalPhotos > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportEventImages(evt);
                    }}
                    className="h-7 px-2.5 text-xs rounded-lg text-zinc-300 hover:text-white bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 gap-1.5 transition-colors"
                    title={`Unduh ${totalPhotos} foto event`}
                  >
                    <Download className="size-3.5 text-zinc-400" />
                    <span className="hidden sm:inline font-medium">Foto ({totalPhotos})</span>
                  </Button>
                )}

                {eventDateDisplay && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono font-medium">
                    <Calendar className="size-3 text-zinc-400" />
                    <span>{eventDateDisplay}</span>
                  </div>
                )}

                <ChevronDown
                  className={cn(
                    "size-4 text-zinc-400 transition-transform duration-200",
                    isEventExpanded && "rotate-180"
                  )}
                />
              </div>
            </div>

            {/* Sub Events / Steps List */}
            {isEventExpanded && (
              <div className="p-3 sm:p-4 space-y-3 bg-zinc-950/60">
                {evt.steps.map((step, stepIdx) => {
                  const isStepExpanded = !!expandedSteps[step.step_id];
                  const isStepCompleted = step.status === "completed";

                  const stepDateDisplay = isStepCompleted && step.completed_at
                    ? new Date(step.completed_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : null;

                  return (
                    <div
                      key={step.step_id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/60 transition-all"
                    >
                      {/* Step Header */}
                      <div
                        onClick={() => toggleStep(step.step_id)}
                        className="flex items-center justify-between p-3.5 select-none cursor-pointer hover:bg-zinc-800/40"
                      >
                        <div className="flex items-center gap-2.5">
                          {isStepCompleted ? (
                            <Check className="size-4 text-emerald-400 stroke-[3]" />
                          ) : (
                            <Wrench className="size-4 text-amber-400 animate-pulse" />
                          )}

                          <span className="text-xs sm:text-sm font-semibold text-zinc-200">
                            {stepIdx + 1}. {STEP_TYPE_TITLES[step.step_type] || step.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {stepDateDisplay && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                              {stepDateDisplay}
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-mono font-semibold">
                            {step.images.length} foto
                          </span>

                          <ChevronDown
                            className={cn(
                              "size-4 text-zinc-400 transition-transform duration-200",
                              isStepExpanded && "rotate-180"
                            )}
                          />
                        </div>
                      </div>

                      {/* Step Gallery */}
                      {isStepExpanded && (
                        <div className="p-3 sm:p-4 border-t border-zinc-800/60 space-y-3 bg-zinc-950/80">
                          {step.images.length === 0 ? (
                            <p className="text-xs text-zinc-500 italic">Belum ada foto dokumentasi pada tahap ini.</p>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                              {deduplicateImages(step.images).map((img, imgIdx) => {
                                const imgSrc = img.signedUrl || img.thumbnail_path || img.storage_path;
                                return (
                                  <div
                                    key={img.storage_path || img.id || `public-img-${imgIdx}`}
                                    onClick={() => openLightbox(step.images, imgIdx, STEP_TYPE_TITLES[step.step_type] || step.title)}
                                    className="group relative aspect-square rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden cursor-pointer hover:border-emerald-500 transition-all shadow-sm"
                                  >
                                    <img
                                      src={imgSrc}
                                      alt={`Dokumentasi ${imgIdx + 1}`}
                                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {events.length > 3 && (
        <div className="pt-2 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((prev) => (hasMoreEvents ? prev + 3 : 3))}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs font-semibold rounded-xl px-5"
          >
            <span>{hasMoreEvents ? "Tampilkan Event Lainnya" : "Sembunyikan Sebagian"}</span>
            <ChevronDown
              className={cn(
                "size-3.5 ml-1 transition-transform duration-200",
                !hasMoreEvents && "rotate-180"
              )}
            />
          </Button>
        </div>
      )}

      {/* Lightbox Modal */}
      <ImageLightbox
        isOpen={lightboxState.isOpen}
        images={lightboxState.images}
        currentIndex={lightboxState.currentIndex}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
        onNavigate={(newIdx) => setLightboxState((prev) => ({ ...prev, currentIndex: newIdx }))}
      />
    </div>
  );
}
