import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { PDFPageItem, WorkingPdfState } from '../types'
import { readPdfFile } from '../utils/pdfReader'
import { exportReorderedPdf, triggerFileDownload } from '../utils/pdfExporter'
import {
  savePdfSessionToStorage,
  getPdfSessionFromStorage,
  updatePagesInStorage,
  clearPdfSessionFromStorage,
} from '../utils/indexedDbStorage'

export function usePdfOrganizer() {
  const [pdfState, setPdfState] = useState<WorkingPdfState | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isRestoring, setIsRestoring] = useState<boolean>(true)
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number; message: string }>({
    current: 0,
    total: 0,
    message: '',
  })
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [exportMessage, setExportMessage] = useState<string>('')
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; pageIndex: number }>({
    isOpen: false,
    pageIndex: 0,
  })

  // Restore from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      try {
        const stored = await getPdfSessionFromStorage()
        if (isMounted && stored && stored.fileData) {
          setPdfState({
            fileData: stored.fileData,
            fileName: stored.fileName,
            fileSize: stored.fileSize,
            totalPages: stored.totalPages,
            pages: stored.pages || [],
            originalPages: stored.originalPages || [],
            deletedPages: stored.deletedPages || [],
            lastModified: stored.lastModified,
          })
          toast.success('Sesi PDF sebelumnya berhasil dipulihkan dari penyimpanan lokal.', {
            description: `${stored.fileName} (${stored.pages?.length || 0} halaman aktif)`,
          })
        }
      } catch (err) {
        console.warn('Gagal memulihkan sesi dari IndexedDB:', err)
      } finally {
        if (isMounted) {
          setIsRestoring(false)
        }
      }
    }

    restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  // Handle PDF file upload
  const handleUploadFile = useCallback(async (file: File) => {
    if (!file) return

    const isPdf =
      file.name.toLowerCase().endsWith('.pdf') ||
      (file.type && file.type.toLowerCase().includes('pdf'))

    if (!isPdf) {
      toast.error('Berkas tidak valid', {
        description: `File "${file.name}" bukan berkas PDF. Silakan pilih berkas berekstensi .pdf.`,
      })
      return
    }

    setIsLoading(true)
    setLoadingProgress({ current: 0, total: 0, message: 'Menyiapkan pembacaan PDF...' })

    try {
      const result = await readPdfFile(file, file.name, (current, total, message) => {
        setLoadingProgress({ current, total, message })
      })

      const newState: WorkingPdfState = {
        fileData: result.fileData,
        fileName: result.fileName,
        fileSize: result.fileSize,
        totalPages: result.totalPages,
        pages: [...result.pages],
        originalPages: [...result.pages],
        deletedPages: [],
        lastModified: Date.now(),
      }

      // 1. Immediately update in-memory React state so the UI displays all pages right away
      setPdfState(newState)

      // 2. Persist to IndexedDB in background without blocking or throwing UI error if quota exceeded
      try {
        await savePdfSessionToStorage({
          fileData: result.fileData,
          fileName: result.fileName,
          fileSize: result.fileSize,
          totalPages: result.totalPages,
          pages: result.pages,
          originalPages: result.pages,
          deletedPages: [],
          lastModified: Date.now(),
        })
      } catch (storageErr) {
        console.warn('Gagal menyimpan sesi ke IndexedDB (sesi tetap aktif di memori):', storageErr)
      }

      toast.success('Dokumen PDF berhasil dimuat!', {
        description: `Berhasil memproses ${result.totalPages} halaman dari ${file.name}`,
      })
    } catch (error: any) {
      console.error('handleUploadFile error:', error)
      toast.error('Gagal memuat dokumen PDF', {
        description: error?.message || 'Terjadi kesalahan saat memproses berkas PDF.',
      })
    } finally {
      setIsLoading(false)
      setLoadingProgress({ current: 0, total: 0, message: '' })
    }
  }, [])

  // Reorder pages (from dnd-kit)
  const handleReorderPages = useCallback(
    async (newPages: PDFPageItem[]) => {
      if (!pdfState) return

      const updatedState = {
        ...pdfState,
        pages: newPages,
        lastModified: Date.now(),
      }

      setPdfState(updatedState)
      await updatePagesInStorage(newPages, pdfState.deletedPages)
    },
    [pdfState]
  )

  // Delete / exclude a page
  const handleDeletePage = useCallback(
    async (pageId: string) => {
      if (!pdfState) return

      const targetPage = pdfState.pages.find((p) => p.id === pageId)
      if (!targetPage) return

      const newPages = pdfState.pages.filter((p) => p.id !== pageId)
      const newDeleted = [...pdfState.deletedPages, targetPage]

      const updatedState: WorkingPdfState = {
        ...pdfState,
        pages: newPages,
        deletedPages: newDeleted,
        lastModified: Date.now(),
      }

      setPdfState(updatedState)
      await updatePagesInStorage(newPages, newDeleted)

      toast.info(`Halaman ${targetPage.displayPageNumber} dihapus dari urutan`, {
        description: 'Anda dapat mereset urutan kapan saja untuk memulihkan halaman.',
        action: {
          label: 'Urungkan',
          onClick: () => {
            handleRestorePage(targetPage.id)
          },
        },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pdfState]
  )

  // Restore single page from deleted list
  const handleRestorePage = useCallback(
    async (pageId: string) => {
      if (!pdfState) return

      const target = pdfState.deletedPages.find((p) => p.id === pageId)
      if (!target) return

      const newDeleted = pdfState.deletedPages.filter((p) => p.id !== pageId)
      const newPages = [...pdfState.pages, target].sort((a, b) => a.originalIndex - b.originalIndex)

      const updatedState: WorkingPdfState = {
        ...pdfState,
        pages: newPages,
        deletedPages: newDeleted,
        lastModified: Date.now(),
      }

      setPdfState(updatedState)
      await updatePagesInStorage(newPages, newDeleted)
      toast.success(`Halaman ${target.displayPageNumber} berhasil dikembalikan.`)
    },
    [pdfState]
  )

  // Reset to original sequence and restore all deleted pages
  const handleResetOrder = useCallback(async () => {
    if (!pdfState) return

    const resetPages = [...pdfState.originalPages]
    const updatedState: WorkingPdfState = {
      ...pdfState,
      pages: resetPages,
      deletedPages: [],
      lastModified: Date.now(),
    }

    setPdfState(updatedState)
    await updatePagesInStorage(resetPages, [])
    toast.success('Urutan halaman dikembalikan ke format awal.')
  }, [pdfState])

  // Clear session / Reset all
  const handleClearCache = useCallback(async () => {
    await clearPdfSessionFromStorage()
    setPdfState(null)
    setPreviewModal({ isOpen: false, pageIndex: 0 })
    toast.info('Penyimpanan sementara PDF berhasil dibersihkan.')
  }, [])

  // Export & download new PDF
  const handleExportPdf = useCallback(
    async (customFileName?: string) => {
      if (!pdfState || !pdfState.fileData) {
        toast.error('Tidak ada dokumen PDF untuk diekspor.')
        return
      }

      if (pdfState.pages.length === 0) {
        toast.error('Dokumen kosong', {
          description: 'Harap sisakan minimal satu halaman untuk diekspor.',
        })
        return
      }

      setIsExporting(true)
      setExportMessage('Menyiapkan kompilasi PDF...')

      try {
        const pageIndices = pdfState.pages.map((p) => p.originalIndex)
        const outputName =
          customFileName ||
          `${pdfState.fileName.replace(/\.pdf$/i, '')}-organizer-export.pdf`

        const result = await exportReorderedPdf(pdfState.fileData, pageIndices, (percent, status) => {
          setExportMessage(`${status} (${percent}%)`)
        })

        triggerFileDownload(result.blob, outputName)

        toast.success('PDF baru berhasil dibuat & diunduh!', {
          description: `${result.pageCount} halaman diekspor (${(result.fileSize / 1024 / 1024).toFixed(2)} MB)`,
        })
      } catch (error: any) {
        console.error('handleExportPdf error:', error)
        toast.error('Gagal mengekspor PDF', {
          description: error?.message || 'Terjadi kesalahan saat membuat dokumen PDF baru.',
        })
      } finally {
        setIsExporting(false)
        setExportMessage('')
      }
    },
    [pdfState]
  )

  // Preview modal controls
  const openPreview = useCallback((pageIndex: number) => {
    setPreviewModal({
      isOpen: true,
      pageIndex: Math.max(0, pageIndex),
    })
  }, [])

  const closePreview = useCallback(() => {
    setPreviewModal((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const setPreviewIndex = useCallback((index: number) => {
    setPreviewModal((prev) => ({ ...prev, pageIndex: index }))
  }, [])

  return {
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
  }
}
