import { useState, type FC } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { PDFPageItem } from '../types'
import { PdfPageCard } from './PdfPageCard'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfPageGridProps {
  pages: PDFPageItem[]
  onReorder: (newPages: PDFPageItem[]) => void
  onDelete: (id: string) => void
  onPreview: (index: number) => void
  onReset: () => void
}

export const PdfPageGrid: FC<PdfPageGridProps> = ({
  pages,
  onReorder,
  onDelete,
  onPreview,
  onReset,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag begins, allowing clean clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.id === active.id)
      const newIndex = pages.findIndex((p) => p.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(pages, oldIndex, newIndex)
        onReorder(reordered)
      }
    }
  }

  const activePage = activeId ? pages.find((p) => p.id === activeId) : null
  const activePageIndex = activePage ? pages.findIndex((p) => p.id === activeId) : 0

  if (pages.length === 0) {
    return (
      <div className="w-full py-16 px-4 text-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center gap-4">
        <div className="size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-base font-semibold text-foreground">Semua Halaman Telah Dihapus</h3>
          <p className="text-xs text-muted-foreground">
            Tidak ada halaman yang tersisa untuk diekspor. Klik tombol di bawah untuk mengembalikan seluruh halaman dokumen.
          </p>
        </div>
        <Button onClick={onReset} variant="outline" size="sm" className="rounded-xl gap-2 font-medium">
          <RotateCcw className="size-3.5" />
          Pulihkan Semua Halaman
        </Button>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pages.map((page, index) => (
            <PdfPageCard
              key={page.id}
              page={page}
              index={index}
              onDelete={onDelete}
              onPreview={onPreview}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay with floating active card */}
      <DragOverlay dropAnimation={null}>
        {activePage ? (
          <div className="w-48 max-w-full">
            <PdfPageCard
              page={activePage}
              index={activePageIndex}
              onDelete={() => {}}
              onPreview={() => {}}
              isDragOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
