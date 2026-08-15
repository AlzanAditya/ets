import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, Sparkles, Layers } from 'lucide-react'
import { PageContent } from '@/components/page-content'
import { Button } from '@/components/ui/button'
import {
  usePdfOrganizer,
  PdfDropzone,
  PdfHeaderBar,
  PdfStatsBanner,
  PdfPageGrid,
  PdfPreviewModal,
} from '@/features/berita-acara'

export default function BeritaAcaraPage() {
  const navigate = useNavigate()
  const {
    pdfState,
    isLoading,
    isRestoring,
    loadingProgress,
    isExporting,
    exportMessage,
    previewModal,
    handleUploadFile,
    handleReorderPages,
    handleDeletePage,
    handleRestorePage,
    handleResetOrder,
    handleClearCache,
    handleExportPdf,
    openPreview,
    closePreview,
    setPreviewIndex,
  } = usePdfOrganizer()

  return (
    <PageContent
      title="Berita Acara — PDF Organizer"
      eyebrow="Dokumen & Operasional"
      description="Kelola, susun ulang urutan halaman, hapus halaman, dan ekspor dokumen PDF Berita Acara secara lossless."
    >
      <div className="space-y-6 pb-12">
        {/* Top Navigation & Breadcrumbs */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports')}
            className="rounded-xl gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            <span>Kembali ke Daftar Laporan</span>
          </Button>

          {pdfState && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                Tersimpan di Penyimpanan Lokal (IndexedDB)
              </span>
            </div>
          )}
        </div>

        {/* Restoring State */}
        {isRestoring ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground">Memeriksa sesi dokumen tersimpan...</p>
          </div>
        ) : !pdfState ? (
          /* Empty / Upload State */
          <div className="space-y-8 animate-in fade-in duration-300">
            <PdfDropzone
              onUpload={handleUploadFile}
              isLoading={isLoading}
              loadingProgress={loadingProgress}
            />

            {/* Quick feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="p-4 rounded-xl bg-card border border-border/80 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Layers className="size-4" />
                  <span>Drag & Drop Reorder</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Geser kartu thumbnail untuk menata ulang urutan halaman dokumen secara fleksibel.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/80 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Sparkles className="size-4" />
                  <span>Kualitas Asli (Lossless)</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Diekspor menggunakan pdf-lib sehingga teks, vektor, dan gambar tidak di-rasterize atau buram.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/80 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <ShieldCheck className="size-4" />
                  <span>Otomatis Pulih (IndexedDB)</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Progres Anda tersimpan aman di browser, tidak akan hilang meski halaman tidak sengaja di-refresh.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Document Editor State */
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Action Bar */}
            <PdfHeaderBar
              pdfState={pdfState}
              isExporting={isExporting}
              exportMessage={exportMessage}
              onExport={() => handleExportPdf()}
              onReset={handleResetOrder}
              onClearCache={handleClearCache}
              onUploadNew={handleUploadFile}
            />

            {/* Sequence & Deleted info banner */}
            <PdfStatsBanner
              originalPages={pdfState.originalPages}
              currentPages={pdfState.pages}
              deletedPages={pdfState.deletedPages}
              onRestorePage={handleRestorePage}
            />

            {/* Page Grid with DND */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Halaman Dokumen</h3>
                  <p className="text-xs text-muted-foreground">
                    Tarik kartu untuk memindahkan posisi. Klik thumbnail untuk melihat halaman penuh.
                  </p>
                </div>
                <span className="text-xs font-mono font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                  {pdfState.pages.length} Halaman Aktif
                </span>
              </div>

              <PdfPageGrid
                pages={pdfState.pages}
                onReorder={handleReorderPages}
                onDelete={handleDeletePage}
                onPreview={openPreview}
                onReset={handleResetOrder}
              />
            </div>
          </div>
        )}

        {/* Page Preview Modal */}
        {pdfState && (
          <PdfPreviewModal
            isOpen={previewModal.isOpen}
            pageIndex={previewModal.pageIndex}
            pages={pdfState.pages}
            onClose={closePreview}
            onSelectIndex={setPreviewIndex}
            onDeletePage={handleDeletePage}
          />
        )}
      </div>
    </PageContent>
  )
}
