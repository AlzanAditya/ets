import * as React from "react"
import {
  MapPin,
  QrCode,
  Building2,
  Upload,
  Eye,
  Wrench,
  Phone,
  FileText,
  Plus,
  X,
  Check,
  CircleDot,
  Loader2,
  ChevronDown,
  Image as ImageIcon,
  Trash2,
  FileCheck2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ImageLightbox, type LightboxImage } from "@/components/image-lightbox"
import { EmptyState } from "@/components/empty-state"
import type { WorkerJob } from "../data/mock-worker-data"
import { useWorkerData } from "@/hooks/use-worker-data"
import { cn } from "@/lib/utils"

export interface CurrentJobCardProps {
  job: WorkerJob | null
  onUpdateJob?: (updatedJob: WorkerJob) => void
  onViewDetail?: (jobId: string) => void
  onUploadDocumentation?: (jobId: string) => void
  className?: string
}

export function CurrentJobCard({
  job: initialJob,
  onViewDetail,
  className,
}: CurrentJobCardProps) {
  const { uploadStepPhotos, deleteStepPhoto, completeWorkerStep } = useWorkerData()
  const [job, setJob] = React.useState<WorkerJob | null>(initialJob)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [selectedStepId, setSelectedStepId] = React.useState<string>("")
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  const [uploadedPhotos, setUploadedPhotos] = React.useState<{ id: string; url: string; name: string }[]>([])
  const [isUploading, setIsUploading] = React.useState(false)

  // Step accordion state
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
    setJob((prev) => {
      if (prev?.id === initialJob?.id && prev?.eventId === initialJob?.eventId && prev?.steps?.length === initialJob?.steps?.length) {
        return prev
      }
      return initialJob
    })
    if (initialJob?.steps && initialJob.steps.length > 0) {
      const activeIdx = initialJob.currentStepIndex >= 0 ? initialJob.currentStepIndex : 0
      const newStepId = initialJob.steps[activeIdx]?.id || initialJob.steps[0]?.id || ""
      setSelectedStepId((prev) => (prev === newStepId ? prev : newStepId))
    }
  }, [initialJob])

  if (!job) {
    return (
      <EmptyState
        icon={Wrench}
        title="Tidak ada pekerjaan hari ini"
        description="Semua tugas telah diselesaikan atau Anda sedang tidak memiliki penugasan aktif saat ini."
      />
    )
  }

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }))
  }

  // Handle uploading photos directly to a step
  const handleDirectUploadStepPhoto = async (stepId: string, stepType: string | undefined, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (!job.eventId) {
      toast.error("Detail ID Event tidak ditemukan.")
      return
    }

    setUploadingStepId(stepId)
    const toastId = "upload-step-direct"
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

  // Delete photo from step
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

  // Complete step
  const handleCompleteStep = async (stepId: string, stepName: string) => {
    if (!job.eventId) {
      toast.error("Detail ID Event tidak ditemukan.")
      return
    }

    setCompletingStepId(stepId)
    const toastId = "complete-step-job"
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

  const activeStep = job.steps.find((s) => s.id === selectedStepId) || job.steps[job.currentStepIndex] || job.steps[0]

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setSelectedFiles((prev) => [...prev, ...files])
    const newPhotos = files.map((file, i) => ({
      id: `photo-${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      name: file.name,
    }))

    setUploadedPhotos((prev) => [...prev, ...newPhotos])
    toast.success(`${files.length} foto dipilih untuk ${activeStep?.name || "dokumentasi"}`)
  }

  const handleSaveUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Silakan pilih minimal 1 foto dokumentasi.")
      return
    }

    if (!job.eventId || !activeStep?.id) {
      toast.error("Detail step tidak ditemukan.")
      return
    }

    setIsUploading(true)
    const toastId = "worker-upload-photos"
    try {
      toast.loading(`Mengunggah ${selectedFiles.length} foto ke storage...`, { id: toastId })
      await uploadStepPhotos(
        job.id,
        job.eventId,
        activeStep.id,
        activeStep.step_type || "installation",
        selectedFiles
      )
      toast.success(`Berhasil mengunggah ${selectedFiles.length} foto!`, { id: toastId })
      setUploadOpen(false)
      setUploadedPhotos([])
      setSelectedFiles([])
    } catch (err: any) {
      console.error("Failed to upload step photos:", err)
      toast.error(err?.message || "Gagal mengunggah foto", { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  const productImage = job.clientLogo || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80"

  return (
    <>
      <div
        className={cn(
          "rounded-2xl border border-border bg-card text-card-foreground p-4 shadow-md space-y-4 relative overflow-hidden transition-all",
          className
        )}
      >
        {/* Header: Title & Main Event pill */}
        <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-3">
          <span className="text-xs font-bold text-muted-foreground">Pekerjaan Aktif</span>
          <Badge
            variant="outline"
            className="font-bold text-[11px] px-2.5 py-0.5 rounded-full border-primary/40 text-accent-foreground bg-primary/10"
          >
            {job.mainEvent}
          </Badge>
        </div>

        {/* Product & Client Info */}
        <div className="flex items-start gap-3">
          <div className="size-14 rounded-xl border border-border bg-muted overflow-hidden shrink-0">
            <img src={productImage} alt={job.productName} className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-extrabold text-sm text-foreground truncate">
              {job.clientName}
            </h3>
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
              <QrCode className="size-3 text-muted-foreground shrink-0" />
              <span className="truncate">{job.serialNumber}</span>
            </div>
            <div className="flex items-start gap-1 text-[11px] text-muted-foreground">
              <MapPin className="size-3 text-rose-400 shrink-0 mt-0.5" />
              <span className="line-clamp-1">{job.clientAddress}</span>
            </div>
          </div>
        </div>

        {/* Stepper Progress Section with Accordion matching product-event-accordion.tsx */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <span>Progress {job.mainEvent}</span>
            <span className="text-accent-foreground font-mono">
              {job.steps.filter((s) => s.status === "completed").length}/{job.steps.length} Selesai
            </span>
          </div>

          <div className="space-y-2">
            {job.steps.map((step, idx) => {
              const isCompleted = idx < job.currentStepIndex || step.status === "completed"
              const isActive = idx === job.currentStepIndex || step.status === "active"
              const isExpanded = expandedSteps[step.id] ?? isActive
              const isUploadingThis = uploadingStepId === step.id
              const isCompletingThis = completingStepId === step.id

              return (
                <div
                  key={step.id || idx}
                  className={cn(
                    "rounded-xl border transition-all overflow-hidden",
                    isCompleted
                      ? "bg-primary/5 border-primary/20"
                      : isActive
                      ? "bg-amber-500/5 border-amber-500/30 shadow-2xs"
                      : "bg-muted/40 border-border opacity-80"
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
                          "size-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          isCompleted
                            ? "bg-primary text-primary-foreground"
                            : isActive
                            ? "bg-amber-500 text-slate-950 font-extrabold"
                            : "bg-muted border border-border text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="size-3 stroke-[3]" />
                        ) : isActive ? (
                          <CircleDot className="size-3 stroke-[3]" />
                        ) : (
                          <span className="text-[10px]">{idx + 1}</span>
                        )}
                      </div>

                      <span
                        className={cn(
                          "text-xs font-medium",
                          isCompleted
                            ? "text-accent-foreground font-semibold"
                            : isActive
                            ? "text-amber-400 font-bold"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {step.photos && step.photos.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-muted text-muted-foreground border border-border">
                          <ImageIcon className="size-3 mr-1 text-accent-foreground" />
                          {step.photos.length}
                        </Badge>
                      )}

                      <span
                        className={cn(
                          "text-[10px] font-mono",
                          isCompleted
                            ? "text-accent-foreground"
                            : isActive
                            ? "text-amber-400 font-semibold"
                            : "text-muted-foreground"
                        )}
                      >
                        {isCompleted
                          ? step.completedAt || "Selesai"
                          : isActive
                          ? "Proses"
                          : "Mendatang"}
                      </span>

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
                    <div className="p-3 pt-0 border-t border-border/60 space-y-3 mt-1">
                      {/* Photos grid */}
                      <div className="grid grid-cols-4 gap-2 pt-2">
                        {step.photos?.map((photo, pIdx) => (
                          <div
                            key={photo.id || pIdx}
                            onClick={() => openLightbox(step.photos || [], pIdx, step.name)}
                            className="aspect-square rounded-xl border border-border bg-muted overflow-hidden relative group cursor-pointer shadow-2xs hover:border-primary/50 transition-all"
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
                          <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-all bg-muted/40 hover:bg-muted/80">
                            {isUploadingThis ? (
                              <Loader2 className="size-4 animate-spin text-accent-foreground" />
                            ) : (
                              <>
                                <Plus className="size-4 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                                <span className="text-[9px] font-semibold text-muted-foreground mt-0.5">Upload</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              disabled={isUploadingThis}
                              className="sr-only"
                              onChange={(e) => handleDirectUploadStepPhoto(step.id, step.step_type, e)}
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
                            className="text-xs font-bold gap-1.5 rounded-xl h-8 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-sans"
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

        {/* Action Buttons (Right Bottom) */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDetailOpen(true)
              if (onViewDetail) onViewDetail(job.id)
            }}
            className="text-xs font-semibold gap-1.5 rounded-xl h-9 px-3 border-border text-foreground hover:bg-muted"
          >
            <Eye className="size-3.5" />
            <span>Lihat Detail</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setUploadOpen(true)}
            className="text-xs font-bold gap-1.5 rounded-xl h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Upload className="size-3.5" />
            <span>Upload Foto</span>
          </Button>
        </div>
      </div>

      <ImageLightbox
        images={lightboxState.images}
        currentIndex={lightboxState.currentIndex}
        isOpen={lightboxState.isOpen}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
        onNavigate={(newIdx) => setLightboxState((prev) => ({ ...prev, currentIndex: newIdx }))}
      />

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-card border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <Building2 className="size-4 text-accent-foreground" />
              <span>Detail Pekerjaan - {job.clientName}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Informasi teknis dan lokasi pengerjaan ETS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs py-2">
            <div className="rounded-xl bg-muted/80 p-3 space-y-2 border border-border">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Main Event:</span>
                <Badge variant="outline" className="font-bold text-[11px] px-2 border-primary/30 text-accent-foreground bg-primary/10">
                  {job.mainEvent}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Serial Number:</span>
                <span className="font-mono font-bold text-foreground">{job.serialNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Produk:</span>
                <span className="font-semibold text-foreground">{job.productName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Kategori:</span>
                <span className="text-foreground/90">{job.productCategory}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border p-3 space-y-2 bg-background/40">
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">Lokasi Pengerjaan:</div>
                  <div className="text-foreground/90">{job.location}</div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">{job.clientAddress}</div>
                </div>
              </div>

              {job.clientPhone && (
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <Phone className="size-3.5 text-accent-foreground shrink-0" />
                  <span className="text-muted-foreground">Kontak Klien:</span>
                  <a href={`tel:${job.clientPhone}`} className="text-accent-foreground font-bold hover:underline">
                    {job.clientPhone}
                  </a>
                </div>
              )}
            </div>

            {job.notes && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-amber-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-[11px]">
                  <FileText className="size-3.5 text-amber-400" />
                  <span>Catatan Khusus Lapangan:</span>
                </div>
                <p className="text-[11px] leading-relaxed">{job.notes}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDetailOpen(false)} className="w-full rounded-xl border-border text-foreground hover:bg-muted">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-card border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <Upload className="size-4 text-accent-foreground" />
              <span>Upload Foto Dokumentasi</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Unggah foto hasil pengerjaan untuk unit <span className="font-bold text-foreground">{job.productName}</span> ({job.serialNumber}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Step Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Pilih Tahap Pekerjaan:</label>
              <select
                value={selectedStepId}
                onChange={(e) => setSelectedStepId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-muted border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {job.steps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status === "completed" ? "Selesai" : s.status === "active" ? "Aktif" : "Mendatang"})
                  </option>
                ))}
              </select>
            </div>

            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/60 transition-colors">
              <Plus className="size-8 text-muted-foreground mb-1" />
              <span className="text-xs font-semibold text-foreground">Pilih atau Ambil Foto</span>
              <span className="text-[11px] text-muted-foreground mt-0.5">Format JPG, PNG, WEBP</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleFileSelect}
              />
            </label>

            {uploadedPhotos.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Foto Terpilih ({uploadedPhotos.length})
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {uploadedPhotos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square rounded-lg border border-border overflow-hidden group">
                      <img src={photo.url} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedPhotos((prev) => prev.filter((p) => p.id !== photo.id))
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white opacity-90 hover:opacity-100"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              size="sm"
              variant="outline"
              disabled={isUploading}
              onClick={() => setUploadOpen(false)}
              className="rounded-xl border-border text-foreground hover:bg-muted"
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={isUploading || selectedFiles.length === 0}
              onClick={handleSaveUpload}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold gap-1.5"
            >
              {isUploading && <Loader2 className="size-3.5 animate-spin" />}
              <span>Simpan &amp; Unggah Foto</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
