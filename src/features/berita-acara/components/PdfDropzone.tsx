import { useRef, useState, useEffect } from 'react'
import { FileUp, FileText, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface PdfDropzoneProps {
  onUpload: (file: File) => void
  isLoading: boolean
  loadingProgress?: { current: number; total: number; message: string }
}

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({
  onUpload,
  isLoading,
  loadingProgress,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Prevent browser default file open behavior when dragged anywhere on the window
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault()
    }
    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault()
    }
    window.addEventListener('dragover', handleWindowDragOver)
    window.addEventListener('drop', handleWindowDrop)
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver)
      window.removeEventListener('drop', handleWindowDrop)
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoading) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (isLoading) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      const isPdf =
        file.name.toLowerCase().endsWith('.pdf') ||
        (file.type && file.type.toLowerCase().includes('pdf'))

      if (isPdf) {
        onUpload(file)
      } else {
        toast.error('Berkas tidak didukung', {
          description: `Berkas "${file.name}" bukan PDF. Silakan pilih berkas berekstensi .pdf.`,
        })
      }
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      onUpload(file)
      // Reset input value so selecting the same file again triggers onChange
      e.target.value = ''
    }
  }

  // Create a sample multi-page PDF in-browser using pdf-lib for instant demo
  const handleLoadSamplePdf = async () => {
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      const font = await doc.embedFont(StandardFonts.HelveticaBold)
      const regularFont = await doc.embedFont(StandardFonts.Helvetica)

      const samplePages = [
        { title: 'BERITA ACARA SERAH TERIMA', subtitle: 'Halaman 1: Dokumen Utama & Informasi Unit', color: rgb(0.1, 0.35, 0.7) },
        { title: 'SPESIFIKASI TEKNIS & HASIL UJI', subtitle: 'Halaman 2: Data Pengukuran Tegangan & Beban', color: rgb(0.15, 0.6, 0.35) },
        { title: 'FOTO DOKUMENTASI UNIT LAPANGAN', subtitle: 'Halaman 3: Foto Visual Sebelum & Sesudah Instalasi', color: rgb(0.8, 0.45, 0.1) },
        { title: 'CHECKLIST SERTIFIKASI & COMMISSIONING', subtitle: 'Halaman 4: Hasil Pemeriksaan Komponen & Kelistrikan', color: rgb(0.55, 0.2, 0.7) },
        { title: 'LEMBAR PENGESAHAN & TANDA TANGAN', subtitle: 'Halaman 5: Tanda Tangan Pihak Pertama & Kedua', color: rgb(0.2, 0.2, 0.2) },
      ]

      for (let i = 0; i < samplePages.length; i++) {
        const pageInfo = samplePages[i]
        const page = doc.addPage([595, 842]) // A4
        const { width, height } = page.getSize()

        // Header band
        page.drawRectangle({
          x: 40,
          y: height - 100,
          width: width - 80,
          height: 60,
          color: pageInfo.color,
        })

        page.drawText(pageInfo.title, {
          x: 60,
          y: height - 65,
          size: 16,
          font: font,
          color: rgb(1, 1, 1),
        })

        page.drawText(pageInfo.subtitle, {
          x: 60,
          y: height - 85,
          size: 11,
          font: regularFont,
          color: rgb(0.95, 0.95, 0.95),
        })

        // Content placeholder box
        page.drawRectangle({
          x: 40,
          y: 120,
          width: width - 80,
          height: height - 240,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
          color: rgb(0.98, 0.98, 0.98),
        })

        page.drawText(`HALAMAN ASLI #${i + 1}`, {
          x: width / 2 - 100,
          y: height / 2 + 20,
          size: 28,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        })

        page.drawText('Sampel Berita Acara ETS - Gunakan untuk menguji drag & drop reorder', {
          x: width / 2 - 170,
          y: height / 2 - 15,
          size: 12,
          font: regularFont,
          color: rgb(0.5, 0.5, 0.5),
        })

        // Footer
        page.drawText(`Dokumen Berita Acara No: BA-2026/08/ETS-${100 + i}  |  Halaman ${i + 1} dari ${samplePages.length}`, {
          x: 60,
          y: 60,
          size: 10,
          font: regularFont,
          color: rgb(0.4, 0.4, 0.4),
        })
      }

      const pdfBytes = await doc.save()
      const sampleBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const sampleFile = new File([sampleBlob], 'Sampel_Berita_Acara_5_Halaman.pdf', { type: 'application/pdf' })

      onUpload(sampleFile)
    } catch (err) {
      console.error('Failed to generate sample PDF:', err)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[340px] ${
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.01] ring-4 ring-primary/10'
            : 'border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30'
        } ${isLoading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Loader2 className="size-8 animate-spin" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-semibold text-foreground">Sedang Memproses Dokumen PDF</h3>
              <p className="text-sm text-muted-foreground">
                {loadingProgress?.message || 'Membaca berkas dan merender thumbnail halaman...'}
              </p>
            </div>

            {loadingProgress && loadingProgress.total > 0 && (
              <div className="w-64 mt-2">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.round((loadingProgress.current / loadingProgress.total) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5 font-mono">
                  <span>Hal. {loadingProgress.current}</span>
                  <span>{Math.round((loadingProgress.current / loadingProgress.total) * 100)}%</span>
                  <span>Total {loadingProgress.total}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs border border-primary/20">
              <FileUp className="size-8 stroke-[1.75]" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Unggah Dokumen PDF Berita Acara
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tarik dan lepas file PDF Anda ke sini, atau klik untuk memilih file dari komputer Anda.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                size="lg"
                className="rounded-xl font-semibold gap-2 shadow-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isLoading) {
                    fileInputRef.current?.click()
                  }
                }}
              >
                <FileText className="size-4" />
                Pilih Berkas PDF
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border/60 w-full max-w-lg mt-2">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                100% Client-Side (Aman & Privat)
              </span>
              <span>•</span>
              <span>Kualitas PDF Asli Lossless</span>
              <span>•</span>
              <span>Mendukung Drag & Drop Reorder</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick demo sample button */}
      {!isLoading && (
        <div className="mt-4 flex items-center justify-center">
          <button
            type="button"
            onClick={handleLoadSamplePdf}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted py-2 px-3.5 rounded-lg transition-colors border border-border/60"
          >
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Ingin langsung mencoba? Muat contoh PDF Berita Acara (5 Halaman)</span>
          </button>
        </div>
      )}
    </div>
  )
}
