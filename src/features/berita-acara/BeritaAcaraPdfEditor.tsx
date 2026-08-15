import * as React from "react"
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  CheckCircle2Icon,
  DownloadIcon,
  FileUpIcon,
  GripVerticalIcon,
  Loader2Icon,
  RotateCcwIcon,
  Trash2Icon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react"
import * as pdfjsLib from "pdfjs-dist"
import { PDFDocument } from "pdf-lib"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PdfPageThumbnail } from "./PdfPageThumbnail"
import {
  clearCachedBeritaAcara,
  getCachedBeritaAcara,
  saveCachedBeritaAcara,
} from "./pdf-cache"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

type PdfDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>

interface SortablePageProps {
  pageNumber: number
  pdfDocument: PdfDocumentProxy
  onDelete: (pageNumber: number) => void
  onPreview: (pageNumber: number) => void
}

function SortablePage({ pageNumber, pdfDocument, onDelete, onPreview }: SortablePageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pageNumber,
  })

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group relative min-w-0 ${isDragging ? "z-20 opacity-40" : ""}`}
    >
      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-sm">
        <div className="relative border-b border-border/70 bg-muted/20 p-2">
          <PdfPageThumbnail
            pdfDocument={pdfDocument}
            pageNumber={pageNumber}
            onClick={() => onPreview(pageNumber)}
          />

          <button
            type="button"
            {...attributes}
            {...listeners}
            className="absolute left-3 top-3 inline-flex size-8 cursor-grab items-center justify-center rounded-md border border-border/70 bg-background/90 text-muted-foreground shadow-sm backdrop-blur active:cursor-grabbing"
            aria-label={`Geser halaman ${pageNumber}`}
            title="Drag untuk mengubah urutan"
          >
            <GripVerticalIcon className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(pageNumber)}
            className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md border border-destructive/30 bg-background/90 text-destructive shadow-sm backdrop-blur hover:bg-destructive/10"
            aria-label={`Hapus halaman ${pageNumber}`}
            title="Hapus halaman"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">Halaman {pageNumber}</span>
          <button
            type="button"
            onClick={() => onPreview(pageNumber)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Preview
          </button>
        </div>
      </Card>
    </article>
  )
}

export default function BeritaAcaraPdfEditor() {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pdfBytes, setPdfBytes] = React.useState<ArrayBuffer | null>(null)
  const [pdfDocument, setPdfDocument] = React.useState<PdfDocumentProxy | null>(null)
  const [pageOrder, setPageOrder] = React.useState<number[]>([])
  const [originalOrder, setOriginalOrder] = React.useState<number[]>([])
  const [fileName, setFileName] = React.useState("berita-acara")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)
  const [isDraggingFile, setIsDraggingFile] = React.useState(false)
  const [activePage, setActivePage] = React.useState<number | null>(null)
  const [previewPage, setPreviewPage] = React.useState<number | null>(null)
  const [cacheReady, setCacheReady] = React.useState(false)
  const [cacheUpdatedAt, setCacheUpdatedAt] = React.useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const loadPdf = React.useCallback(async (bytes: ArrayBuffer, name: string, restoredOrder?: number[]) => {
    setIsLoading(true)
    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) })
      const document = await loadingTask.promise
      const totalPages = document.numPages
      const validOrder = restoredOrder?.filter((page) => page >= 1 && page <= totalPages)
      const order = validOrder?.length ? validOrder : Array.from({ length: totalPages }, (_, index) => index + 1)

      setPdfBytes(bytes)
      setPdfDocument(document)
      setOriginalOrder(Array.from({ length: totalPages }, (_, index) => index + 1))
      setPageOrder(order)
      setFileName(name.replace(/\.pdf$/i, "") || "berita-acara")
      setCacheReady(true)
    } catch (error) {
      console.error(error)
      toast.error("PDF tidak dapat dibuka", {
        description: "Pastikan file yang dipilih adalah PDF yang valid.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false

    const restoreCache = async () => {
      try {
        const cached = await getCachedBeritaAcara()
        if (cancelled || !cached) return
        setCacheUpdatedAt(cached.updatedAt)
        await loadPdf(cached.pdfBytes, cached.fileName, cached.pageOrder)
      } catch (error) {
        console.error("Failed to restore Berita Acara cache:", error)
      } finally {
        if (!cancelled) setCacheReady(true)
      }
    }

    void restoreCache()
    return () => {
      cancelled = true
    }
  }, [loadPdf])

  React.useEffect(() => {
    if (!pdfBytes || pageOrder.length === 0) return

    const timeout = window.setTimeout(async () => {
      try {
        await saveCachedBeritaAcara(`${fileName}.pdf`, pdfBytes, pageOrder)
        setCacheUpdatedAt(Date.now())
      } catch (error) {
        console.error("Failed to save Berita Acara cache:", error)
        toast.warning("Perubahan belum tersimpan ke cache browser", {
          description: "Storage browser mungkin penuh atau dibatasi oleh perangkat.",
        })
      }
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [fileName, pageOrder, pdfBytes])

  const handleFile = React.useCallback(
    async (file?: File) => {
      if (!file) return
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("File harus berupa PDF")
        return
      }

      const bytes = await file.arrayBuffer()
      await loadPdf(bytes, file.name)
    },
    [loadPdf],
  )

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDraggingFile(false)
    void handleFile(event.dataTransfer.files[0])
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePage(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    setPageOrder((current) => {
      const oldIndex = current.indexOf(Number(active.id))
      const newIndex = current.indexOf(Number(over.id))
      return arrayMove(current, oldIndex, newIndex)
    })
  }

  const handleDelete = (pageNumber: number) => {
    setPageOrder((current) => current.filter((page) => page !== pageNumber))
    setPreviewPage((current) => (current === pageNumber ? null : current))
  }

  const handleResetOrder = () => {
    if (originalOrder.length === 0) return
    setPageOrder([...originalOrder])
    toast.success("Urutan halaman dikembalikan")
  }

  const handleClearCache = async () => {
    if (!window.confirm("Hapus PDF yang tersimpan di cache browser?")) return
    try {
      await clearCachedBeritaAcara()
      setPdfBytes(null)
      setPdfDocument(null)
      setPageOrder([])
      setOriginalOrder([])
      setCacheUpdatedAt(null)
      setCacheReady(true)
      if (inputRef.current) inputRef.current.value = ""
      toast.success("Cache PDF dihapus")
    } catch (error) {
      console.error(error)
      toast.error("Gagal menghapus cache PDF")
    }
  }

  const handleDownload = async () => {
    if (!pdfBytes || pageOrder.length === 0) return
    setIsExporting(true)
    try {
      const source = await PDFDocument.load(pdfBytes)
      const output = await PDFDocument.create()
      const copiedPages = await output.copyPages(source, pageOrder.map((page) => page - 1))
      copiedPages.forEach((page) => output.addPage(page))

      const outputBytes = await output.save()
      const outputBuffer = outputBytes.buffer.slice(outputBytes.byteOffset, outputBytes.byteOffset + outputBytes.byteLength) as ArrayBuffer
      const blob = new Blob([outputBuffer], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${fileName || "berita-acara"}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success("PDF berhasil dibuat", {
        description: `${pageOrder.length} halaman diunduh sesuai urutan saat ini.`,
      })
    } catch (error) {
      console.error(error)
      toast.error("Gagal membuat PDF hasil")
    } finally {
      setIsExporting(false)
    }
  }

  const activePdfPage = activePage ?? null
  const formattedCacheTime = cacheUpdatedAt
    ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(cacheUpdatedAt)
    : null

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Dokumen & Analitik</p>
          <h1 className="text-2xl font-bold tracking-tight">Berita Acara</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Upload PDF, susun ulang halaman dengan drag & drop, hapus halaman yang tidak diperlukan, lalu unduh versi final tanpa mengirim file ke server.
          </p>
        </div>
        {pdfBytes && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleResetOrder} disabled={isExporting}>
              <RotateCcwIcon />
              Reset urutan
            </Button>
            <Button variant="destructive" onClick={handleClearCache} disabled={isExporting}>
              <Trash2Icon />
              Hapus cache
            </Button>
            <Button onClick={() => void handleDownload()} disabled={isExporting || pageOrder.length === 0}>
              {isExporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
              Download PDF
            </Button>
          </div>
        )}
      </div>

      {!pdfBytes && (
        <Card
          onDragOver={(event) => {
            event.preventDefault()
            setIsDraggingFile(true)
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={handleDrop}
          className={`border-dashed transition-colors ${isDraggingFile ? "border-primary bg-primary/5" : "border-border/80"}`}
        >
          <CardContent className="flex min-h-[340px] flex-col items-center justify-center gap-5 p-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {isLoading ? <Loader2Icon className="size-8 animate-spin" /> : <UploadCloudIcon className="size-8" />}
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Upload PDF Berita Acara</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Tarik PDF ke area ini atau pilih file dari perangkat. File akan diproses langsung di browser.
              </p>
            </div>
            <Button onClick={() => inputRef.current?.click()} disabled={isLoading}>
              <FileUpIcon />
              Pilih PDF
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            {cacheReady && (
              <p className="text-xs text-muted-foreground">
                {formattedCacheTime ? `Cache terakhir tersedia pukul ${formattedCacheTime}.` : "Cache browser siap digunakan."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {pdfBytes && pdfDocument && (
        <>
          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2Icon className="size-5 text-emerald-500" />
                  {fileName}.pdf
                </CardTitle>
                <CardDescription>
                  {pageOrder.length} halaman akan diunduh • perubahan otomatis disimpan di cache browser
                  {formattedCacheTime ? ` • terakhir ${formattedCacheTime}` : ""}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value.replace(/\.pdf$/i, ""))}
                  className="w-[190px]"
                  aria-label="Nama file hasil"
                />
                <Button variant="outline" onClick={() => inputRef.current?.click()}>
                  Ganti PDF
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(event) => void handleFile(event.target.files?.[0])}
                />
              </div>
            </CardHeader>
          </Card>

          {pageOrder.length === 0 ? (
            <Card className="border-destructive/40">
              <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                <Trash2Icon className="size-8 text-destructive" />
                <div>
                  <p className="font-semibold">Semua halaman dihapus</p>
                  <p className="text-sm text-muted-foreground">Reset urutan untuk mengembalikan seluruh halaman.</p>
                </div>
                <Button variant="outline" onClick={handleResetOrder}>Kembalikan halaman</Button>
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(event) => setActivePage(Number(event.active.id))}
              onDragCancel={() => setActivePage(null)}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={pageOrder} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {pageOrder.map((pageNumber, index) => (
                    <div key={pageNumber} className="relative">
                      <div className="absolute left-2 top-2 z-10 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                        #{index + 1}
                      </div>
                      <SortablePage
                        pageNumber={pageNumber}
                        pdfDocument={pdfDocument}
                        onDelete={handleDelete}
                        onPreview={setPreviewPage}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>{activePdfPage ? <div className="rounded-xl border bg-background p-4 shadow-2xl">Memindahkan halaman {activePdfPage}</div> : null}</DragOverlay>
            </DndContext>
          )}
        </>
      )}

      {previewPage && pdfDocument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewPage(null)}
        >
          <div className="relative flex max-h-[92vh] max-w-[92vw] flex-col rounded-xl bg-background p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 px-2 pb-2">
              <span className="text-sm font-semibold">Preview halaman {previewPage}</span>
              <button type="button" onClick={() => setPreviewPage(null)} className="rounded-md p-1.5 hover:bg-muted" aria-label="Tutup preview">
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto rounded-lg bg-muted/30 p-4">
              <PdfPageThumbnail pdfDocument={pdfDocument} pageNumber={previewPage} className="min-h-0 bg-transparent" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
