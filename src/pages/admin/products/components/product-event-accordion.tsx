import * as React from "react";
import {
  Wrench,
  Check,
  Lock,
  Plus,
  Trash2,
  X,
  GripVertical,
  ChevronDown,
  Loader2,
  Calendar,
  FileCheck2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { exportImages } from "@/lib/image-export";
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
import { EventWorkerAssignment } from "./event-worker-assignment";

interface ProductEventAccordionProps {
  productId: string;
  isProductReadOnly?: boolean;
  onEventsUpdated?: () => void;
}

export function ProductEventAccordion({
  productId,
  isProductReadOnly = false,
  onEventsUpdated,
}: ProductEventAccordionProps) {
  const { user, role } = useAuth();
  const isAuthenticated = Boolean(user && role !== "guest");
  const canDeletePhotos = isAuthenticated && !isProductReadOnly;

  const [events, setEvents] = React.useState<ProductEventData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedEvents, setExpandedEvents] = React.useState<Record<string, boolean>>({});
  const [expandedSteps, setExpandedSteps] = React.useState<Record<string, boolean>>({});
  const [uploadingStepId, setUploadingStepId] = React.useState<string | null>(null);
  const [actionLoadingStepId, setActionLoadingStepId] = React.useState<string | null>(null);
  const [creatingMaint, setCreatingMaint] = React.useState(false);

  // Photo delete confirmation state
  const [imageToDelete, setImageToDelete] = React.useState<{
    eventId: string;
    stepId: string;
    imageId: string;
    storagePath?: string;
    thumbnailPath?: string | null;
  } | null>(null);
  const [deletingImageId, setDeletingImageId] = React.useState<string | null>(null);

  // Maximum preview count state (default: 3)
  const [visibleCount, setVisibleCount] = React.useState(3);

  // Drag and drop state
  const [draggedImage, setDraggedImage] = React.useState<{
    eventId: string;
    stepId: string;
    index: number;
  } | null>(null);

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

  // AlertDialog Confirmation States
  const [subEventToComplete, setSubEventToComplete] = React.useState<{
    eventId: string;
    stepId: string;
    stepTitle: string;
  } | null>(null);

  const [mainEventToComplete, setMainEventToComplete] = React.useState<{
    eventId: string;
    eventTitle: string;
  } | null>(null);

  const [confirmCreateMaintenanceOpen, setConfirmCreateMaintenanceOpen] = React.useState(false);

  const loadEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await productEventsService.getProductEvents(productId);
      
      // Sort events newest first (sequence_number descending) so latest maintenance is at top
      const sortedEvents = [...data].sort((a, b) => b.sequence_number - a.sequence_number);
      setEvents(sortedEvents);

      // Auto expand active or latest event
      const initialEventState: Record<string, boolean> = {};
      const initialStepState: Record<string, boolean> = {};

      sortedEvents.forEach((evt, idx) => {
        // Expand active events or the top (latest) event
        const isEvtActive = evt.status === "active" || idx === 0;
        initialEventState[evt.event_id] = isEvtActive;

        evt.steps.forEach((st) => {
          if (st.status === "active" || (st.status === "completed" && st.images.length > 0)) {
            initialStepState[st.step_id] = true;
          }
        });
      });

      setExpandedEvents((prev) => ({ ...initialEventState, ...prev }));
      setExpandedSteps((prev) => ({ ...initialStepState, ...prev }));
    } catch (err) {
      console.error("Failed to load product events:", err);
      toast.error("Gagal memuat event produk");
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

  // Complete a step via RPC/service
  const executeCompleteStep = async (eventId: string, stepId: string) => {
    setActionLoadingStepId(stepId);
    try {
      const updated = await productEventsService.completeStep(productId, eventId, stepId);
      const sorted = [...updated].sort((a, b) => b.sequence_number - a.sequence_number);
      setEvents(sorted);
      toast.success("Sub event berhasil diselesaikan");
      onEventsUpdated?.();
    } catch (err: any) {
      console.error("Error completing step:", err);
      toast.error(err.message || "Gagal menyelesaikan sub event");
    } finally {
      setActionLoadingStepId(null);
      setSubEventToComplete(null);
    }
  };

  // Complete an entire event via RPC/service
  const executeCompleteEvent = async (eventId: string) => {
    setActionLoadingStepId(eventId);
    try {
      const updated = await productEventsService.completeEvent(productId, eventId);
      const sorted = [...updated].sort((a, b) => b.sequence_number - a.sequence_number);
      setEvents(sorted);
      toast.success("Event berhasil diselesaikan!");
      onEventsUpdated?.();
    } catch (err: any) {
      console.error("Error completing event:", err);
      toast.error(err.message || "Gagal menyelesaikan event");
    } finally {
      setActionLoadingStepId(null);
      setMainEventToComplete(null);
    }
  };

  // Create new Maintenance Event
  const executeCreateMaintenance = async () => {
    setCreatingMaint(true);
    try {
      const updated = await productEventsService.createMaintenanceEvent(productId);
      const sorted = [...updated].sort((a, b) => b.sequence_number - a.sequence_number);
      setEvents(sorted);
      toast.success("Event Maintenance baru berhasil dibuat!");
      onEventsUpdated?.();

      // Auto expand the new maintenance event (which is at the top)
      const topEvent = sorted[0];
      if (topEvent) {
        setExpandedEvents((prev) => ({ ...prev, [topEvent.event_id]: true }));
        if (topEvent.steps[0]) {
          setExpandedSteps((prev) => ({ ...prev, [topEvent.steps[0].step_id]: true }));
        }
      }
    } catch (err: any) {
      console.error("Error creating maintenance event:", err);
      toast.error(err.message || "Gagal membuat event maintenance");
    } finally {
      setCreatingMaint(false);
      setConfirmCreateMaintenanceOpen(false);
    }
  };

  // Upload multiple files
  const handleMultipleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    eventData: ProductEventData,
    stepData: ProductStepData
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingStepId(stepData.step_id);
    const toastId = "upload-step-imgs";
    try {
      toast.loading(`Mengunggah ${files.length} gambar ke storage...`, { id: toastId });
      const updatedEvents = await productEventsService.uploadMultipleStepImages(
        productId,
        eventData.event_id,
        stepData.step_id,
        stepData.step_type,
        files
      );
      const sorted = [...updatedEvents].sort((a, b) => b.sequence_number - a.sequence_number);
      setEvents(sorted);
      toast.success(`${files.length} gambar berhasil diunggah`, { id: toastId });
    } catch (err: any) {
      console.error("Upload step images failed:", err);
      toast.error(err.message || "Gagal mengunggah gambar", { id: toastId });
    } finally {
      setUploadingStepId(null);
      e.target.value = "";
    }
  };

  // Execute delete image from storage and DB
  const executeDeleteImage = async (
    eventId: string,
    stepId: string,
    imageId: string,
    storagePath?: string,
    thumbnailPath?: string | null
  ) => {
    setDeletingImageId(imageId);
    const toastId = toast.loading("Menghapus foto...");
    try {
      const updated = await productEventsService.deleteStepImage(
        productId,
        eventId,
        stepId,
        imageId,
        storagePath,
        thumbnailPath || undefined
      );
      const sorted = [...updated].sort((a, b) => b.sequence_number - a.sequence_number);
      setEvents(sorted);
      setImageToDelete(null);
      toast.success("Foto berhasil dihapus", { id: toastId });
      onEventsUpdated?.();
    } catch (err: any) {
      console.error("Failed to delete image:", err);
      toast.error(err.message || "Gagal menghapus foto", { id: toastId });
    } finally {
      setDeletingImageId(null);
    }
  };

  // Lightbox delete handler
  const handleLightboxDelete = async (image: LightboxImage, _idx: number) => {
    let eventId = image.eventId;
    let stepId = image.stepId;

    if (!eventId || !stepId) {
      for (const evt of events) {
        for (const st of evt.steps) {
          if (st.images.some((img) => img.id === image.id)) {
            eventId = evt.event_id;
            stepId = st.step_id;
            break;
          }
        }
        if (eventId) break;
      }
    }

    if (eventId && stepId) {
      await executeDeleteImage(eventId, stepId, image.id, image.storage_path, image.thumbnail_path);
    }
  };

  // Delete image trigger (opens confirmation modal)
  const handleDeleteImage = (
    eventId: string,
    stepId: string,
    imageId: string,
    storagePath?: string,
    thumbnailPath?: string | null
  ) => {
    setImageToDelete({
      eventId,
      stepId,
      imageId,
      storagePath,
      thumbnailPath,
    });
  };

  // Export Level 2: Export all images for a Main Event
  const handleExportEventImages = async (evt: ProductEventData) => {
    const images = evt.steps.flatMap((step) =>
      step.images.map((img) => ({
        source: img.signedUrl || img.storage_path,
        fileName: img.file_name || undefined,
        context: {
          event: evt.title || evt.event_type,
          step: STEP_TYPE_TITLES[step.step_type] || step.title,
        },
      }))
    );

    if (images.length === 0) {
      toast.info("Tidak ada foto pada event ini.");
      return;
    }

    const toastId = toast.loading(`Mempersiapkan ${images.length} foto event ${evt.title}...`);

    try {
      await exportImages({
        images,
        pipeline: ["convert:jpeg", "zip", "download"],
        jpegQuality: 0.9,
        zip: {
          name: `Event_${evt.title}_Foto`,
          folderStrategy: "step",
        },
        fileNaming: {
          template: "{step}_{index}",
          indexPadding: 3,
        },
        onProgress: (p) => {
          if (p.stage === "fetching" || p.stage === "converting") {
            toast.loading(`Memproses foto event (${p.currentFileIndex}/${p.totalFiles})...`, { id: toastId });
          } else if (p.stage === "zipping") {
            toast.loading(`Membuat ZIP event (${p.percentage}%)...`, { id: toastId });
          } else if (p.stage === "downloading") {
            toast.loading("Memulai unduhan...", { id: toastId });
          }
        },
        onComplete: (res) => {
          if (res.success) {
            toast.success(`Berhasil mengunduh ${res.exportedCount} foto event ${evt.title}`, { id: toastId });
          } else {
            toast.error(`Selesai dengan ${res.failedCount} berkas gagal`, { id: toastId });
          }
        },
        onError: (err) => {
          toast.error(`Gagal unduh event: ${err.message}`, { id: toastId });
        },
      });
    } catch (err: any) {
      toast.error(`Gagal unduh event: ${err?.message || err}`, { id: toastId });
    }
  };

  // Export Level 3: Export all images for a Sub Event (Step)
  const handleExportStepImages = async (evt: ProductEventData, step: ProductStepData) => {
    const images = step.images.map((img) => ({
      source: img.signedUrl || img.storage_path,
      fileName: img.file_name || undefined,
      context: {
        event: evt.title || evt.event_type,
        step: STEP_TYPE_TITLES[step.step_type] || step.title,
      },
    }));

    if (images.length === 0) {
      toast.info("Tidak ada foto pada sub event ini.");
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
          name: `${evt.title}_${stepTitle}_Foto`,
          folderStrategy: "none",
        },
        fileNaming: {
          template: "{step}_{index}",
          indexPadding: 3,
        },
        onProgress: (p) => {
          if (p.stage === "fetching" || p.stage === "converting") {
            toast.loading(`Memproses foto step (${p.currentFileIndex}/${p.totalFiles})...`, { id: toastId });
          } else if (p.stage === "zipping") {
            toast.loading(`Membuat ZIP step (${p.percentage}%)...`, { id: toastId });
          } else if (p.stage === "downloading") {
            toast.loading("Memulai unduhan...", { id: toastId });
          }
        },
        onComplete: (res) => {
          if (res.success) {
            toast.success(`Berhasil mengunduh ${res.exportedCount} foto ${stepTitle}`, { id: toastId });
          } else {
            toast.error(`Selesai dengan ${res.failedCount} berkas gagal`, { id: toastId });
          }
        },
        onError: (err) => {
          toast.error(`Gagal unduh sub event: ${err.message}`, { id: toastId });
        },
      });
    } catch (err: any) {
      toast.error(`Gagal unduh sub event: ${err?.message || err}`, { id: toastId });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (eventId: string, stepId: string, index: number) => {
    setDraggedImage({ eventId, stepId, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (eventId: string, stepId: string, dropIndex: number, currentImages: ProductStepImage[]) => {
    if (!draggedImage || draggedImage.eventId !== eventId || draggedImage.stepId !== stepId) return;

    const dragIdx = draggedImage.index;
    if (dragIdx === dropIndex) return;

    const reordered = [...currentImages];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIndex, 0, moved);

    setDraggedImage(null);

    try {
      const updated = await productEventsService.reorderStepImages(productId, eventId, stepId, reordered);
      const sorted = [...updated].sort((a, b) => b.sequence_number - a.sequence_number);
      setEvents(sorted);
      toast.success("Urutan gambar diperbarui");
    } catch (err) {
      console.error("Reorder failed:", err);
    }
  };

  // Open Lightbox for a step gallery
  const openLightbox = (
    images: ProductStepImage[],
    initialIdx: number,
    stepTitle: string,
    eventId?: string,
    stepId?: string
  ) => {
    const lightboxImages: LightboxImage[] = images.map((img, i) => ({
      id: img.id,
      url: img.signedUrl || img.thumbnail_path || img.storage_path,
      title: `${stepTitle} - Foto ${i + 1}`,
      storage_path: img.storage_path,
      thumbnail_path: img.thumbnail_path,
      eventId,
      stepId,
    }));

    setLightboxState({
      isOpen: true,
      images: lightboxImages,
      currentIndex: initialIdx,
    });
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span>Memuat event produk...</span>
      </div>
    );
  }

  // Check workflow validation: Are all existing main events completed?
  const allMainEventsCompleted = events.every((e) => e.status === "completed");

  // Pagination for main events (Requirement 10)
  const visibleEvents = events.slice(0, visibleCount);
  const hasMoreEvents = visibleCount < events.length;

  const handleToggleShowMore = () => {
    if (hasMoreEvents) {
      setVisibleCount((prev) => Math.min(prev + 3, events.length));
    } else {
      setVisibleCount(3);
    }
  };

  return (
    <div className="space-y-4">
      {/* Event List */}
      {visibleEvents.map((evt) => {
        const isEventExpanded = !!expandedEvents[evt.event_id];
        const isEventCompleted = evt.status === "completed";
        const completedStepsCount = evt.steps.filter((s) => s.status === "completed").length;
        const allStepsFinished = completedStepsCount === evt.steps.length;

        // Date logic
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
            className="rounded-2xl border border-zinc-800 bg-zinc-950/80 text-zinc-100 overflow-hidden transition-all shadow-md"
          >
            {/* Level 1: Main Event Header */}
            <div
              onClick={() => toggleEvent(evt.event_id)}
              className={cn(
                "flex items-center justify-between p-4 cursor-pointer select-none transition-colors",
                isEventExpanded ? "bg-zinc-900/90 border-b border-zinc-800/80" : "hover:bg-zinc-900/50"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Event Status Icon */}
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

                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold tracking-wider uppercase text-zinc-100">
                    {evt.title}
                  </h3>
                  {/* REQUIREMENT 1: NO "Event Selesai (Read Only)" text! */}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Level 2: Download Main Event Photos Button */}
                {evt.steps.some((s) => s.images.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportEventImages(evt);
                    }}
                    className="h-7 px-2 text-xs rounded-lg text-zinc-400 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 gap-1.5 transition-colors"
                    title={`Unduh semua foto event ${evt.title}`}
                  >
                    <Download className="size-3.5 text-zinc-400 group-hover:text-zinc-200" />
                    <span className="hidden md:inline font-medium">Unduh</span>
                  </Button>
                )}

                {/* Timestamp Pill (shown if completed) */}
                {eventDateDisplay && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono font-medium">
                    <Calendar className="size-3 text-zinc-400" />
                    <span>{eventDateDisplay}</span>
                  </div>
                )}

                {/* REQUIREMENT 1: NO "4/4" progress badge if event is completed! */}
                {!isEventCompleted && (
                  <div className="flex items-center justify-center px-2.5 py-0.5 rounded-lg bg-zinc-800/90 border border-zinc-700/80 text-zinc-200 text-xs font-bold font-mono">
                    {completedStepsCount}/{evt.steps.length}
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

            {/* Level 1 Content: Sub Events / Steps List */}
            {isEventExpanded && (
              <div className="p-3 sm:p-4 space-y-3 bg-zinc-950/40">
                {/* Main Event Worker Assignment */}
                <EventWorkerAssignment
                  eventId={evt.event_id}
                  eventTitle={evt.title}
                  eventType={evt.event_type}
                  steps={evt.steps}
                  isReadOnly={isEventCompleted}
                />

                {evt.steps.map((step, stepIdx) => {
                  const isStepExpanded = !!expandedSteps[step.step_id];
                  const isStepLocked = step.status === "locked";
                  const isStepActive = step.status === "active";
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
                      className={cn(
                        "rounded-xl border transition-all",
                        isStepLocked
                          ? "border-zinc-800/50 bg-zinc-900/30 opacity-60"
                          : isStepActive
                          ? "border-amber-500/30 bg-zinc-900/80 shadow-xs"
                          : "border-zinc-800 bg-zinc-900/50"
                      )}
                    >
                      {/* Level 2: Sub Event Header */}
                      <div
                        onClick={() => !isStepLocked && toggleStep(step.step_id)}
                        className={cn(
                          "flex items-center justify-between p-3.5 select-none",
                          !isStepLocked && "cursor-pointer hover:bg-zinc-800/40"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Step Status Icon */}
                          {isStepLocked ? (
                            <Lock className="size-4 text-zinc-500" />
                          ) : isStepCompleted ? (
                            <Check className="size-4 text-emerald-400 stroke-[3]" />
                          ) : (
                            <Wrench className="size-4 text-amber-400 animate-pulse" />
                          )}

                          <span
                            className={cn(
                              "text-xs sm:text-sm font-semibold",
                              isStepLocked
                                ? "text-zinc-500"
                                : isStepCompleted
                                ? "text-zinc-200"
                                : "text-amber-300"
                            )}
                          >
                            {stepIdx + 1}. {STEP_TYPE_TITLES[step.step_type] || step.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Level 3: Download Sub Event Photos Button */}
                          {step.images.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportStepImages(evt, step);
                              }}
                              className="h-6 px-1.5 text-xs rounded-md text-zinc-400 hover:text-zinc-100 bg-zinc-950/80 border border-zinc-800 hover:bg-zinc-800 gap-1 transition-colors"
                              title={`Unduh ${step.images.length} foto ${STEP_TYPE_TITLES[step.step_type] || step.title}`}
                            >
                              <Download className="size-3 text-zinc-400" />
                              <span className="hidden md:inline font-medium text-[11px]">Unduh</span>
                            </Button>
                          )}

                          {/* Step Timestamp Pill */}
                          {stepDateDisplay && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                              {stepDateDisplay}
                            </span>
                          )}

                          {/* Image count badge */}
                          <span className="px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 text-xs font-mono font-semibold">
                            {step.images.length}
                          </span>

                          {!isStepLocked && (
                            <ChevronDown
                              className={cn(
                                "size-4 text-zinc-400 transition-transform duration-200",
                                isStepExpanded && "rotate-180"
                              )}
                            />
                          )}
                        </div>
                      </div>

                      {/* Level 3: Gallery & Sub Event Actions */}
                      {isStepExpanded && !isStepLocked && (
                        <div className="p-3 sm:p-4 border-t border-zinc-800/60 space-y-4 bg-zinc-950/60">
                          {/* REQUIREMENT 6: Responsive Image Gallery - 4 columns on mobile! */}
                          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-2.5">
                            {deduplicateImages(step.images).map((img, imgIdx) => (
                              <div
                                key={img.storage_path || img.id || `img-${imgIdx}`}
                                draggable={!isEventCompleted}
                                onDragStart={() => handleDragStart(evt.event_id, step.step_id, imgIdx)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(evt.event_id, step.step_id, imgIdx, step.images)}
                                onClick={() =>
                                  openLightbox(
                                    step.images,
                                    imgIdx,
                                    STEP_TYPE_TITLES[step.step_type] || step.title,
                                    evt.event_id,
                                    step.step_id
                                  )
                                }
                                className="group relative aspect-square rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xs transition-all hover:border-zinc-700 cursor-pointer"
                              >
                                {(() => {
                                  const imgSrc = img.signedUrl || img.thumbnail_path || img.storage_path;
                                  if (!imgSrc) {
                                    return (
                                      <div className="h-full w-full bg-zinc-900/60 animate-pulse flex items-center justify-center text-zinc-600 text-[10px] font-mono">
                                        ...
                                      </div>
                                    );
                                  }
                                  return (
                                    <img
                                      src={imgSrc}
                                      alt={`Foto ${imgIdx + 1}`}
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      loading="lazy"
                                    />
                                  );
                                })()}

                                {/* Drag handle overlay */}
                                {!isEventCompleted && (
                                  <div
                                    className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-1 rounded-md text-white cursor-grab active:cursor-grabbing"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <GripVertical className="size-3" />
                                  </div>
                                )}

                                {/* Delete image X button (mobile-friendly and authenticated only) */}
                                {canDeletePhotos && !isEventCompleted && (
                                  <button
                                    type="button"
                                    disabled={deletingImageId === img.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteImage(
                                        evt.event_id,
                                        step.step_id,
                                        img.id,
                                        img.storage_path,
                                        img.thumbnail_path
                                      );
                                    }}
                                    className="absolute top-1 right-1 z-10 size-6 sm:size-6 flex items-center justify-center rounded-full bg-black/75 hover:bg-rose-600 active:scale-90 text-white shadow-md border border-white/20 transition-all opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                                    title="Hapus foto"
                                    aria-label="Hapus foto"
                                  >
                                    {deletingImageId === img.id ? (
                                      <Loader2 className="size-3 animate-spin text-white" />
                                    ) : (
                                      <X className="size-3.5 stroke-[2.5]" />
                                    )}
                                  </button>
                                )}
                              </div>
                            ))}

                            {/* REQUIREMENT 2: Multiple Photo Upload Button */}
                            {!isEventCompleted && (
                              <label className="group relative aspect-square rounded-xl border-2 border-dashed border-zinc-800 hover:border-amber-500/50 bg-zinc-900/40 hover:bg-zinc-900/80 flex flex-col items-center justify-center cursor-pointer transition-all">
                                {uploadingStepId === step.step_id ? (
                                  <Loader2 className="size-5 animate-spin text-amber-400" />
                                ) : (
                                  <>
                                    <Plus className="size-5 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                                    <span className="text-[10px] sm:text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 mt-1">
                                      Upload
                                    </span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="sr-only"
                                  disabled={uploadingStepId === step.step_id}
                                  onChange={(e) => handleMultipleFileUpload(e, evt, step)}
                                />
                              </label>
                            )}
                          </div>

                          {/* REQUIREMENT 4: Complete Sub Event Button (Disabled if 0 images) */}
                          {!isEventCompleted && isStepActive && (
                            <div className="pt-2 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-2 border-t border-zinc-800/40">
                              {step.images.length === 0 && (
                                <span className="text-xs text-amber-400/90 font-medium italic">
                                  * Minimal 1 foto dokumentasi diperlukan untuk menyelesaikan sub event
                                </span>
                              )}
                              <div className="ml-auto">
                                <Button
                                  size="sm"
                                  disabled={step.images.length === 0 || actionLoadingStepId === step.step_id}
                                  onClick={() =>
                                    setSubEventToComplete({
                                      eventId: evt.event_id,
                                      stepId: step.step_id,
                                      stepTitle: STEP_TYPE_TITLES[step.step_type] || step.title,
                                    })
                                  }
                                  className={cn(
                                    "font-semibold text-xs gap-1.5 rounded-xl shadow-xs transition-all",
                                    stepIdx < evt.steps.length - 1
                                      ? "bg-amber-500 text-zinc-950 hover:bg-amber-400"
                                      : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                                  )}
                                >
                                  {actionLoadingStepId === step.step_id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : stepIdx < evt.steps.length - 1 ? (
                                    <FileCheck2 className="size-3.5" />
                                  ) : (
                                    <Check className="size-3.5 stroke-[3]" />
                                  )}
                                  <span>
                                    {stepIdx < evt.steps.length - 1
                                      ? `Selesaikan ${STEP_TYPE_TITLES[step.step_type] || step.title} & Mulai ${STEP_TYPE_TITLES[evt.steps[stepIdx + 1].step_type] || evt.steps[stepIdx + 1].title}`
                                      : `Selesaikan ${STEP_TYPE_TITLES[step.step_type] || step.title}`}
                                  </span>
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* REQUIREMENT 3B & 4: Complete Main Event Button (When all sub events completed) */}
                          {!isEventCompleted && allStepsFinished && (
                            <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/20">
                              <span className="text-xs text-emerald-400 font-medium">
                                Seluruh sub event telah diselesaikan. Anda dapat menyelesaikan Main Event ini.
                              </span>
                              <Button
                                size="sm"
                                onClick={() =>
                                  setMainEventToComplete({
                                    eventId: evt.event_id,
                                    eventTitle: evt.title,
                                  })
                                }
                                disabled={actionLoadingStepId === evt.event_id}
                                className="bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400 text-xs gap-1.5 rounded-xl shadow-sm shrink-0"
                              >
                                {actionLoadingStepId === evt.event_id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Check className="size-3.5 stroke-[3]" />
                                )}
                                <span>Selesaikan Event</span>
                              </Button>
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

      {/* REQUIREMENT 10: Toggle Show More / Show Less Button */}
      {events.length > 3 && (
        <div className="pt-2 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleShowMore}
            className="border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs font-semibold gap-1.5 rounded-xl px-5 shadow-xs"
          >
            <span>{hasMoreEvents ? "Tampilkan Event Lainnya" : "Sembunyikan Sebagian"}</span>
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                !hasMoreEvents && "rotate-180"
              )}
            />
          </Button>
        </div>
      )}

      {/* REQUIREMENT 3C & 4: Create Maintenance Event Button (ONLY SHOWN IF ALL MAIN EVENTS COMPLETED) */}
      {allMainEventsCompleted && (
        <div className="pt-3 flex justify-end">
          <Button
            onClick={() => setConfirmCreateMaintenanceOpen(true)}
            disabled={creatingMaint}
            variant="outline"
            size="sm"
            className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 text-xs font-bold gap-1.5 rounded-xl px-4 shadow-sm"
          >
            {creatingMaint ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            <span>Tambah Event Maintenance</span>
          </Button>
        </div>
      )}

      {/* ── Lightbox Modal ── */}
      <ImageLightbox
        isOpen={lightboxState.isOpen}
        images={lightboxState.images}
        currentIndex={lightboxState.currentIndex}
        canDelete={canDeletePhotos}
        onDelete={handleLightboxDelete}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
        onNavigate={(newIdx) => setLightboxState((prev) => ({ ...prev, currentIndex: newIdx }))}
      />

      {/* ── AlertDialog: Confirm Delete Photo ── */}
      <AlertDialog
        open={!!imageToDelete}
        onOpenChange={(open) => !open && !deletingImageId && setImageToDelete(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-2xl bg-zinc-950 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg text-zinc-100">Hapus foto ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-zinc-400">
              Foto yang dihapus akan dihilangkan secara permanen dari penyimpanan dan database. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={!!deletingImageId}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl text-xs sm:text-sm"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!!deletingImageId}
              onClick={async (e) => {
                e.preventDefault();
                if (!imageToDelete) return;
                await executeDeleteImage(
                  imageToDelete.eventId,
                  imageToDelete.stepId,
                  imageToDelete.imageId,
                  imageToDelete.storagePath,
                  imageToDelete.thumbnailPath
                );
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs sm:text-sm gap-1.5"
            >
              {deletingImageId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              <span>{deletingImageId ? "Menghapus..." : "Hapus Foto"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog 3A: Confirm Complete Sub Event ── */}
      <AlertDialog
        open={!!subEventToComplete}
        onOpenChange={(open) => !open && setSubEventToComplete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Selesaikan Sub Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Pastikan seluruh dokumentasi pada tahap ini sudah lengkap. Setelah diselesaikan, tahap berikutnya akan dibuka dan tahap ini tidak dapat diedit kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400"
              onClick={() => {
                if (subEventToComplete) {
                  executeCompleteStep(subEventToComplete.eventId, subEventToComplete.stepId);
                }
              }}
            >
              Ya, Selesaikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog 3B: Confirm Complete Main Event ── */}
      <AlertDialog
        open={!!mainEventToComplete}
        onOpenChange={(open) => !open && setMainEventToComplete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Selesaikan Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Pastikan seluruh Sub Event telah selesai dan seluruh dokumentasi sudah lengkap. Setelah event selesai, seluruh dokumentasi akan menjadi Read Only dan Event Maintenance berikutnya dapat dibuat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400"
              onClick={() => {
                if (mainEventToComplete) {
                  executeCompleteEvent(mainEventToComplete.eventId);
                }
              }}
            >
              Ya, Selesaikan Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog 3C: Confirm Create Maintenance Event ── */}
      <AlertDialog
        open={confirmCreateMaintenanceOpen}
        onOpenChange={setConfirmCreateMaintenanceOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buat Event Maintenance Baru?</AlertDialogTitle>
            <AlertDialogDescription>
              Pastikan seluruh pekerjaan maintenance sebelumnya telah selesai. Event baru akan memulai siklus Maintenance berikutnya dan tidak dapat dihapus setelah dibuat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400"
              onClick={executeCreateMaintenance}
            >
              Buat Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
