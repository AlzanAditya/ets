import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  Check,
  ChevronDown,
  Loader2,
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
  type ProductStepData,
  type ProductStepImage,
  STEP_TYPE_TITLES,
} from "@/services/product-events.service";
import { Skeleton } from "@/components/ui/skeleton";

interface PublicEventAccordionProps {
  productId: string;
  serialNumber: string;
  isProductLoading?: boolean;
}

export function PublicEventAccordion({
  productId,
  serialNumber,
  isProductLoading = false,
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
        // Only top-most main event is expanded
        initialEventState[evt.event_id] = idx === 0;
        // Inside top-most main event, only expand the first step
        if (idx === 0 && evt.steps.length > 0) {
          initialStepState[evt.steps[0].step_id] = true;
        }
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

  // Export step images as ZIP
  const handleExportStepImages = async (evt: ProductEventData, step: ProductStepData) => {
    const images = step.images.map((img) => ({
      source: img.signedUrl || img.storage_path,
      fileName: img.file_name || undefined,
      context: {
        event: evt.title || evt.event_type,
        step: STEP_TYPE_TITLES[step.step_type] || step.title,
        productCode: "",
        serialNumber: serialNumber,
      },
    }));

    if (images.length === 0) {
      toast.info("Tidak ada foto pada tahap ini.");
      return;
    }

    const stepTitle = STEP_TYPE_TITLES[step.step_type] || step.title;
    const toastId = toast.loading(`Mempersiapkan ${images.length} foto ${stepTitle}...`);
    try {
      await exportImages({
        images,
        pipeline: ["convert:jpeg", "zip", "download"],
        jpegQuality: 0.9,
        zip: {
          name: `${serialNumber}_${evt.title}_${stepTitle}_Foto`,
          folderStrategy: "none",
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
            toast.success(`Berhasil mengunduh ${res.exportedCount} foto ${stepTitle}`, { id: toastId });
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

  const isAnyLoading = loading || isProductLoading;

  if (isAnyLoading && events.length === 0) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-xl bg-zinc-800" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 bg-zinc-800" />
                  <Skeleton className="h-2.5 w-24 bg-zinc-800" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isAnyLoading && events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center bg-zinc-900/40">
        <p className="text-sm text-zinc-400">Belum ada dokumentasi event tercatat untuk produk ini.</p>
      </div>
    );
  }

  const visibleEvents = events.slice(0, visibleCount);
  const hasMoreEvents = visibleCount < events.length;

  return (
    <div className="relative">
      <div
        className={cn(
          "space-y-4 transition-all duration-300",
          isAnyLoading && "filter blur-[2px] opacity-40 pointer-events-none select-none"
        )}
      >
        {visibleEvents.map((evt) => {
        const isEventExpanded = !!expandedEvents[evt.event_id];
        const isEventCompleted = evt.status === "completed";
        const totalPhotos = evt.steps.reduce((acc, s) => acc + s.images.length, 0);

        const eventDateDisplay = isEventCompleted && evt.completed_at
          ? new Date(evt.completed_at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
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
                  {eventDateDisplay && (
                    <p className="text-xs font-mono font-medium text-zinc-400 mt-0.5">
                      {eventDateDisplay}
                    </p>
                  )}
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
                    className="h-auto p-0 text-xs text-zinc-400 hover:text-white bg-transparent border-none hover:bg-transparent gap-1.5 shadow-none transition-colors"
                    title={`Unduh ${totalPhotos} foto event`}
                  >
                    <Download className="size-3.5 text-zinc-400" />
                    <span className="hidden sm:inline font-medium">Foto ({totalPhotos})</span>
                  </Button>
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
            <AnimatePresence initial={false}>
              {isEventExpanded && (
                <motion.div
                  initial={{ opacity: 0, filter: "blur(6px)", height: 0 }}
                  animate={{ opacity: 1, filter: "blur(0px)", height: "auto" }}
                  exit={{ opacity: 0, filter: "blur(6px)", height: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="p-3 sm:p-4 space-y-3 bg-zinc-950/60">
                    {evt.steps.map((step, stepIdx) => {
                      const isStepExpanded = !!expandedSteps[step.step_id];
                      const isStepCompleted = step.status === "completed";

                      const stepDateDisplay = isStepCompleted && step.completed_at
                        ? new Date(step.completed_at).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : null;

                      return (
                        <div
                          key={step.step_id}
                          className="rounded-xl border border-zinc-800 bg-zinc-900/60 transition-all overflow-hidden"
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

                            <div className="flex items-center gap-2 sm:gap-3">
                              {stepDateDisplay && (
                                <span className="hidden sm:inline-flex items-center text-[11px] font-mono text-zinc-400 border-none bg-transparent p-0">
                                  {stepDateDisplay}
                                </span>
                              )}

                              {step.images.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportStepImages(evt, step);
                                  }}
                                  className="h-auto p-0 text-zinc-400 hover:text-white bg-transparent border-none hover:bg-transparent shadow-none transition-colors"
                                  title={`Unduh ${step.images.length} foto tahap ini`}
                                >
                                  <Download className="size-3.5 text-zinc-400" />
                                </Button>
                              )}

                              <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-mono font-semibold">
                                {step.images.length}
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
                          <AnimatePresence initial={false}>
                            {isStepExpanded && (
                              <motion.div
                                initial={{ opacity: 0, filter: "blur(6px)", height: 0 }}
                                animate={{ opacity: 1, filter: "blur(0px)", height: "auto" }}
                                exit={{ opacity: 0, filter: "blur(6px)", height: 0 }}
                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="p-3 sm:p-4 border-t border-zinc-800/60 space-y-3 bg-zinc-950/80">
                                  {step.images.length === 0 ? (
                                    <p className="text-xs text-zinc-500 italic">Belum ada foto dokumentasi pada tahap ini.</p>
                                  ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                                      {deduplicateImages(step.images).map((img, imgIdx) => {
                                        const imgSrc = img.signedUrl || img.thumbnail_path || img.storage_path;
                                        return (
                                          <motion.div
                                            key={img.storage_path || img.id || `public-img-${imgIdx}`}
                                            initial={{ opacity: 0, filter: "blur(4px)", scale: 0.95 }}
                                            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                                            transition={{ duration: 0.25, delay: imgIdx * 0.04 }}
                                            onClick={() => openLightbox(step.images, imgIdx, STEP_TYPE_TITLES[step.step_type] || step.title)}
                                            className="group relative aspect-square rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden cursor-pointer hover:border-emerald-500 transition-all shadow-sm"
                                          >
                                            <img
                                              src={imgSrc}
                                              alt={`Dokumentasi ${imgIdx + 1}`}
                                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                              loading="lazy"
                                            />
                                          </motion.div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
      </div>

      {/* Spinner Overlay when re-fetching events */}
      {isAnyLoading && events.length > 0 && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/40 backdrop-blur-[2px] rounded-2xl p-4 transition-all duration-200 animate-in fade-in">
          <div className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-2xl">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400 stroke-[2.5]" />
            <span className="text-xs font-semibold text-zinc-300 font-mono tracking-wide">
              Memuat dokumentasi event...
            </span>
          </div>
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
