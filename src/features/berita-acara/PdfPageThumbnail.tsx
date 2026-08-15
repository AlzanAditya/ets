import * as React from "react"
import { FileTextIcon, Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PdfPageThumbnailProps {
  pdfDocument: any
  pageNumber: number
  className?: string
  onClick?: () => void
}

export function PdfPageThumbnail({ pdfDocument, pageNumber, className, onClick }: PdfPageThumbnailProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading")

  React.useEffect(() => {
    let cancelled = false
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null

    const render = async () => {
      setStatus("loading")
      try {
        const page = await pdfDocument.getPage(pageNumber)
        if (cancelled || !canvasRef.current) return

        const baseViewport = page.getViewport({ scale: 1 })
        const maxWidth = 240
        const scale = Math.min(maxWidth / baseViewport.width, 0.55)
        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current
        const context = canvas.getContext("2d", { alpha: false })
        if (!context) throw new Error("Canvas context unavailable")

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.ceil(viewport.width * pixelRatio)
        canvas.height = Math.ceil(viewport.height * pixelRatio)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, viewport.width, viewport.height)

        const task = page.render({ canvasContext: context, viewport })
        renderTask = task
        await task.promise
        if (!cancelled) setStatus("ready")
      } catch (error) {
        if (!cancelled && (error as { name?: string })?.name !== "RenderingCancelledException") {
          setStatus("error")
        }
      }
    }

    void render()
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdfDocument, pageNumber])

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-[220px] w-full items-center justify-center overflow-hidden rounded-lg bg-muted/30 p-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className,
      )}
      aria-label={`Preview halaman ${pageNumber}`}
    >
      <canvas ref={canvasRef} className="max-h-full max-w-full rounded-sm shadow-sm" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/70 text-muted-foreground">
          <FileTextIcon className="size-7" />
          <span className="text-xs">Preview gagal</span>
        </div>
      )}
    </button>
  )
}
