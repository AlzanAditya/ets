import type { FC } from 'react'
import { RotateCcw, Info, Sparkles } from 'lucide-react'
import { PDFPageItem } from '../types'

interface PdfStatsBannerProps {
  originalPages: PDFPageItem[]
  currentPages: PDFPageItem[]
  deletedPages: PDFPageItem[]
  onRestorePage: (id: string) => void
}

export const PdfStatsBanner: FC<PdfStatsBannerProps> = ({
  originalPages,
  currentPages,
  deletedPages,
  onRestorePage,
}) => {
  const originalSequence = originalPages.map((p) => p.displayPageNumber).join(' → ')
  const currentSequence = currentPages.map((p) => p.displayPageNumber).join(' → ')

  const isDifferent = originalSequence !== currentSequence || deletedPages.length > 0

  return (
    <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Sequence flow */}
        <div className="flex items-center gap-2 flex-wrap text-muted-foreground font-mono">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <Info className="size-3.5 text-primary" />
            Urutan Ekspor:
          </span>
          <span className="bg-background px-2 py-0.5 rounded-md border border-border/60 text-foreground font-bold">
            {currentPages.length > 0 ? currentSequence : '(Kosong)'}
          </span>

          {isDifferent && (
            <span className="text-[11px] text-muted-foreground">
              (Asal: <span className="line-through">{originalSequence}</span>)
            </span>
          )}
        </div>

        {/* Lossless hint */}
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
          <Sparkles className="size-3 text-amber-500 shrink-0" />
          <span>Halaman PDF disalin secara lossless tanpa kompresi gambar</span>
        </div>
      </div>

      {/* Deleted pages restore bar */}
      {deletedPages.length > 0 && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/50 flex-wrap">
          <span className="text-[11px] font-semibold text-destructive">
            Halaman Dihapus:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {deletedPages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => onRestorePage(page.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive text-[11px] font-medium transition-colors border border-destructive/20"
                title={`Kembalikan Halaman ${page.displayPageNumber}`}
              >
                <span>Hal. {page.displayPageNumber}</span>
                <RotateCcw className="size-2.5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
