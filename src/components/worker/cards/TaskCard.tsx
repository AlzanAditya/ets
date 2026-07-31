import * as React from "react"
import {
  QrCode,
  MapPin,
  ChevronDown,
  Plus,
  FileCheck2,
  Image as ImageIcon,
  Check,
  Loader2,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox"
import type { WorkerJob } from "../data/mock-worker-data"
import { useWorkerData } from "@/hooks/use-worker-data"
import { cn } from "@/lib/utils"

export type TaskItem = WorkerJob

export interface TaskCardProps {
  job?: WorkerJob | any
  task?: WorkerJob | any
  onJobUpdate?: (updatedJob: WorkerJob) => void
  onStepComplete?: (taskId: string, stepId: string) => void
  onUploadPhoto?: (taskId: string, stepId: string, photo: File) => void
  className?: string
}

export function TaskCard({ job: initialJobProp, task: initialTaskProp, className }: TaskCardProps) {
  const initialJob = initialJobProp || initialTaskProp
  const { uploadStepPhotos, deleteStepPhoto, completeWorkerStep } = useWorkerData()
  const [job, setJob] = React.useState<WorkerJob>(initialJob)
  const [expandedSteps, setExpandedSteps] = React.useState<Record<string, boolean>>({})
  const [uploadingStepId, setUploadingStepId] = React.useState<string | null>(null)
  const [completingStepId, setCompletingStepId] = React.useState<string | null>(null)

  // Lightbox state
  const [lightboxState, setLightboxState] = React.useState<{
    isOpen: boolean
    images: LightboxImage[]
    currentIndex: number
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  })

  React.useEffect(() => {
    setJob(initialJob)
  }, [initialJob])

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }))
  }

  // Handle uploading photos to a step in Supabase storage
  const handleUploadStepPhoto = async (stepId: string, stepType: string | undefined, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (!job.eventId) {
      toast.error("Detail ID Event tidak ditemukan.")
      return
    }

    setUploadingStepId(stepId)
    const toastId = "upload-step-task"
    try {
      toast.loading(`Mengunggah ${files.length} foto ke storage...`, { id: toastId })
      await uploadStepPhotos(
        job.id,
        job.eventId,
        stepId,
        stepType || "installation",
        files
      )
      toast.success(`${files.length} foto berhasil diunggah!`, { id: toastId })
    } catch (err: any) {
      console.error("Failed to upload step photo:", err)
      toast.error(err?.message || "Gagal mengunggah foto", { id: toastId })
    } finally {
      setUploadingStepId(null)
      e.target.value = ""
    }
  }

  // Delete photo
  const handleDeletePhoto = async (stepId: string, photoId: string) => {
    if (!job.eventId) return
    try {
      await deleteStepPhoto(job.id, job.eventId, stepId, photoId)
      toast.success("Foto berhasil dihapus")
    } catch (err) {
      console.error("Failed to delete photo:", err)
      toast.error("Gagal menghapus foto")
    }
  }

  // Open Lightbox
  const openLightbox = (photos: Array<{ id: string; url: string; caption?: string }>, initialIdx: number, stepName: string) => {
    const images: LightboxImage[] = photos.map((p, i) => ({
      id: p.id || `img-${i}`,
      url: p.url,
      title: `${stepName} - Foto ${i + 1}`,
    }))
    setLightboxState({
      isOpen: true,
      images,
      currentIndex: initialIdx,
    })
  }

  // Handle completing a step via Supabase API
  const handleCompleteStep = async (stepId: string, stepName: string) => {
    if (!job.eventId) {
      toast.error("Detail ID Event tidak ditemukan.")
      return
    }

    setCompletingStepId(stepId)
    const toastId = "complete-step-task"
    try {
      toast.loading(`Menyelesaikan tahap ${stepName}...`, { id: toastId })
      await completeWorkerStep(job.id, job.eventId, stepId)
      toast.success(`Tahap "${stepName}" berhasil diselesaikan!`, { id: toastId })
    } catch (err: any) {
      console.error("Failed to complete step:", err)
      toast.error(err?.message || "Gagal menyelesaikan tahap", { id: toastId })
    } finally {
      setCompletingStepId(null)
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-800 bg-[#162028] text-slate-100 p-4 shadow-xs space-y-4 transition-all hover:shadow-md",
        className
      )}
    >
      {/* Top Part of Card: Client Avatar, Client Name, Serial Number, Address */}
      <div className="flex items-start gap-3 border-b pb-3.5 border-border/60">
        <Avatar className="size-11 border shadow-xs shrink-0 bg-muted">
          <AvatarImage src={job.clientLogo} alt={job.clientName} />
          <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
            {job.clientName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm text-foreground truncate">
              {job.clientName}
            </h3>
            <Badge
              variant="outline"
              className={cn(
                "font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0",
                job.mainEvent === "Instalasi"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
              )}
            >
              {job.mainEvent}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <QrCode className="size-3 text-muted-foreground/70 shrink-0" />
            <span className="font-semibold text-foreground/90">{job.serialNumber}</span>
          </div>

          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 text-rose-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2 text-[11px] text-foreground/80">{job.clientAddress}</span>
          </div>
        </div>
      </div>

      {/* Bottom Part: Event Timeline Component */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Event Timeline
          </span>
          <span className="text-xs font-semibold text-muted-foreground">
            {job.steps.filter((s) => s.status === "completed").length}/{job.steps.length} Selesai
          </span>
        </div>

        <div className="space-y-2">
          {job.steps.map((step, idx) => {
            const isCompleted = step.status === "completed"
            const isActive = step.status === "active"
            const isExpanded = expandedSteps[step.id] ?? isActive
            const isUploadingThis = uploadingStepId === step.id
            const isCompletingThis = completingStepId === step.id

            return (
              <div
                key={step.id}
                className={cn(
                  "rounded-xl border transition-all overflow-hidden",
                  isCompleted
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : isActive
                    ? "bg-amber-500/5 border-amber-500/30 shadow-2xs"
                    : "bg-muted/30 border-border/40 opacity-75"
                )}
              >
                {/* Step Header */}
                <div
                  onClick={() => toggleStepExpand(step.id)}
                  className="flex items-center justify-between p-3 cursor-pointer select-none hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "size-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isActive
                          ? "bg-amber-500 text-slate-950 font-extrabold"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="size-3.5 stroke-[3]" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    <span
                      className={cn(
                        "text-xs font-semibold",
                        isCompleted
                          ? "text-emerald-700 dark:text-emerald-400"
                          : isActive
                          ? "text-amber-700 dark:text-amber-400 font-bold"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {step.photos && step.photos.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                        <ImageIcon className="size-3 mr-1" />
                        {step.photos.length}
                      </Badge>
                    )}

                    {step.completedAt && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {step.completedAt}
                      </span>
                    )}

                    <ChevronDown
                      className={cn(
                        "size-4 text-muted-foreground transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </div>
                </div>

                {/* Step Expandable Content: Photo Gallery & Actions */}
                {isExpanded && (
                  <div className="p-3 pt-0 border-t border-border/30 space-y-3 mt-1">
                    {/* Photos grid */}
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      {step.photos?.map((photo, pIdx) => (
                        <div
                          key={photo.id || pIdx}
                          onClick={() => openLightbox(step.photos || [], pIdx, step.name)}
                          className="aspect-square rounded-xl border border-slate-700/80 bg-slate-900 overflow-hidden relative group cursor-pointer shadow-2xs hover:border-slate-500 transition-all"
                        >
                          <img
                            src={photo.url}
                            alt={`Dokumentasi ${pIdx + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {/* Trash button */}
                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeletePhoto(step.id, photo.id)
                              }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-600/90 hover:bg-rose-600 p-1 rounded-md text-white shadow-2xs"
                              title="Hapus foto"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Upload Photo Button */}
                      {!isCompleted && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-500/50 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/80">
                          {isUploadingThis ? (
                            <Loader2 className="size-4 animate-spin text-amber-400" />
                          ) : (
                            <>
                              <Plus className="size-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                              <span className="text-[9px] font-semibold text-slate-400 mt-0.5">Upload</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={isUploadingThis}
                            className="sr-only"
                            onChange={(e) => handleUploadStepPhoto(step.id, step.step_type, e)}
                          />
                        </label>
                      )}
                    </div>

                    {/* Action button to complete step */}
                    {isActive && (
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          disabled={isCompletingThis}
                          onClick={() => handleCompleteStep(step.id, step.name)}
                          className="text-xs font-bold gap-1.5 rounded-xl h-8 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 dark:bg-amber-500 dark:hover:bg-amber-400"
                        >
                          {isCompletingThis ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <FileCheck2 className="size-3.5" />
                          )}
                          <span>Selesaikan Tahap {step.name}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ImageLightbox
        images={lightboxState.images}
        currentIndex={lightboxState.currentIndex}
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
        onNavigate={(newIdx) => setLightboxState((prev) => ({ ...prev, currentIndex: newIdx }))}
      />
    </div>
  )
}
