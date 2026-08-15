import { useRef, type FC, type ChangeEvent } from 'react'
import {
  Download,
  RotateCcw,
  Upload,
  Trash2,
  Loader2,
  FileCheck,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkingPdfState } from '../types'

interface PdfHeaderBarProps {
  pdfState: WorkingPdfState
  isExporting: boolean
  exportMessage?: string
  onExport: () => void
  onReset: () => void
  onClearCache: () => void
  onUploadNew: (file: File) => void
}

export const PdfHeaderBar: FC<PdfHeaderBarProps> = ({
  pdfState,
  isExporting,
  exportMessage,
  onExport,
  onReset,
  onClearCache,
  onUploadNew,
}) => {
  const replaceFileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadNew(e.target.files[0])
      e.target.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const hasModifications =
    pdfState.pages.length !== pdfState.originalPages.length ||
    pdfState.pages.some((p, i) => p.displayPageNumber !== i + 1)

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
      {/* File Information */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
          <FileCheck className="size-5" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-foreground truncate max-w-[280px] sm:max-w-md" title={pdfState.fileName}>
              {pdfState.fileName}
            </h2>
            {hasModifications && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Ada Perubahan Urutan
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 font-medium">
              <Layers className="size-3.5 text-primary" />
              <span>
                {pdfState.pages.length} dari {pdfState.totalPages} Halaman
              </span>
            </span>
            <span>•</span>
            <span>{formatFileSize(pdfState.fileSize)}</span>
            {pdfState.deletedPages.length > 0 && (
              <>
                <span>•</span>
                <span className="text-destructive font-medium">
                  {pdfState.deletedPages.length} Halaman Dihapus
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <input
          ref={replaceFileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Ganti PDF */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => replaceFileInputRef.current?.click()}
          disabled={isExporting}
          className="rounded-xl gap-1.5 text-xs font-semibold"
          title="Unggah berkas PDF baru"
        >
          <Upload className="size-3.5" />
          <span>Ganti PDF</span>
        </Button>

        {/* Reset Urutan */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={!hasModifications || isExporting}
          className="rounded-xl gap-1.5 text-xs font-semibold"
          title="Kembalikan urutan halaman ke kondisi awal"
        >
          <RotateCcw className="size-3.5" />
          <span>Reset Urutan</span>
        </Button>

        {/* Hapus Cache / Sesi */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm('Apakah Anda yakin ingin menghapus data PDF dan mengosongkan halaman ini?')) {
              onClearCache()
            }
          }}
          disabled={isExporting}
          className="rounded-xl gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Hapus sesi dan data PDF dari IndexedDB"
        >
          <Trash2 className="size-3.5" />
          <span className="hidden sm:inline">Hapus Cache</span>
        </Button>

        {/* Download PDF Baru */}
        <Button
          type="button"
          size="sm"
          onClick={onExport}
          disabled={isExporting || pdfState.pages.length === 0}
          className="rounded-xl gap-2 text-xs font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isExporting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>{exportMessage || 'Mengekspor...'}</span>
            </>
          ) : (
            <>
              <Download className="size-4" />
              <span>Unduh PDF Baru</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
