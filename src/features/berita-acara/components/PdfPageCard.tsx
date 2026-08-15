import type { FC, CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, ZoomIn, FileText } from 'lucide-react'
import { PDFPageItem } from '../types'
import { Button } from '@/components/ui/button'

interface PdfPageCardProps {
  page: PDFPageItem
  index: number // 0-based position in current sequence
  onDelete: (id: string) => void
  onPreview: (index: number) => void
  isDragOverlay?: boolean
}

export const PdfPageCard: FC<PdfPageCardProps> = ({
  page,
  index,
  onDelete,
  onPreview,
  isDragOverlay = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: page.id,
    disabled: isDragOverlay,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  const isReordered = page.displayPageNumber !== index + 1

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col rounded-xl border bg-card text-card-foreground shadow-xs transition-all duration-200 overflow-hidden select-none ${
        isDragOverlay
          ? 'shadow-2xl ring-2 ring-primary border-primary scale-105 z-50 cursor-grabbing bg-background'
          : isDragging
          ? 'border-dashed border-primary/50'
          : 'hover:border-primary/50 hover:shadow-md'
      }`}
    >
      {/* Top Header Bar inside Card */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/40 border-b border-border/60 text-xs">
        {/* Sequence Badge */}
        <div className="flex items-center gap-1.5 font-mono">
          <span
            className={`inline-flex items-center justify-center size-5 rounded-md text-[11px] font-bold ${
              isReordered
                ? 'bg-amber-500 text-white dark:bg-amber-600'
                : 'bg-primary text-primary-foreground'
            }`}
            title={`Urutan ke-${index + 1}`}
          >
            {index + 1}
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">
            Hal. {page.displayPageNumber}
          </span>
        </div>

        {/* Action icons: Drag handle & Delete */}
        <div className="flex items-center gap-0.5">
          {/* Drag Handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
            title="Tarik untuk memindahkan urutan"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-3.5" />
          </button>

          {/* Delete Page Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(page.id)
            }}
            className="p-1 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
            title="Hapus halaman ini dari dokumen akhir"
            aria-label="Delete page"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Thumbnail Area */}
      <div
        onClick={() => onPreview(index)}
        className="relative aspect-[1/1.414] w-full bg-muted/20 flex items-center justify-center p-2 cursor-pointer group/thumb overflow-hidden"
      >
        {page.thumbnailUrl ? (
          <img
            src={page.thumbnailUrl}
            alt={`Thumbnail Halaman ${page.displayPageNumber}`}
            className="max-h-full max-w-full object-contain rounded-xs shadow-xs border border-border/40 transition-transform duration-200 group-hover/thumb:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <FileText className="size-10 stroke-1" />
            <span className="text-xs">Hal. {page.displayPageNumber}</span>
          </div>
        )}

        {/* Hover zoom overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 px-2.5 text-xs font-semibold rounded-lg gap-1.5 shadow-md bg-background/95 text-foreground hover:bg-background"
            onClick={(e) => {
              e.stopPropagation()
              onPreview(index)
            }}
          >
            <ZoomIn className="size-3.5" />
            <span>Perbesar</span>
          </Button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-2.5 py-1.5 text-[10px] text-muted-foreground bg-muted/20 border-t border-border/40 flex items-center justify-between">
        <span className="truncate">
          {page.width} × {page.height} pt
        </span>
        {isReordered && (
          <span className="text-amber-600 dark:text-amber-400 font-medium text-[10px]">
            Diubah
          </span>
        )}
      </div>
    </div>
  )
}
