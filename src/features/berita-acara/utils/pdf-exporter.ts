import { jsPDF } from 'jspdf'
import { BeritaAcaraImage } from '../types'

/**
 * Generates an A4 PDF document containing all Berita Acara photos formatted cleanly.
 */
export async function exportBeritaAcaraToPdf(
  images: BeritaAcaraImage[],
  title = 'DOKUMENTASI FOTO BERITA ACARA'
): Promise<void> {
  if (images.length === 0) return

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  // 2 photos per page (vertical layout)
  const photosPerPage = 2
  const totalPages = Math.ceil(images.length / photosPerPage)

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) {
      doc.addPage()
    }

    // Header on each page
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(title, pageWidth / 2, margin, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    doc.text(`Dicetak: ${dateStr} — Halaman ${p + 1} dari ${totalPages}`, pageWidth / 2, margin + 6, { align: 'center' })

    // Divider
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.line(margin, margin + 9, pageWidth - margin, margin + 9)

    // Render photos
    const pagePhotos = images.slice(p * photosPerPage, (p + 1) * photosPerPage)
    const availableHeight = pageHeight - (margin + 12) - margin
    const slotHeight = availableHeight / photosPerPage
    const startY = margin + 12

    for (let i = 0; i < pagePhotos.length; i++) {
      const img = pagePhotos[i]
      const currentSlotY = startY + i * slotHeight
      const globalIdx = p * photosPerPage + i + 1

      // Photo Box
      const boxWidth = pageWidth - margin * 2
      const boxHeight = slotHeight - 12
      const boxY = currentSlotY + 2

      try {
        const base64Data = await getBase64FromUrl(img.previewUrl)
        
        // Calculate aspect ratio
        const imgAspect = (img.width || 4) / (img.height || 3)
        const boxAspect = boxWidth / boxHeight

        let drawW = boxWidth
        let drawH = boxHeight

        if (imgAspect > boxAspect) {
          drawW = boxWidth
          drawH = boxWidth / imgAspect
        } else {
          drawH = boxHeight
          drawW = boxHeight * imgAspect
        }

        const drawX = margin + (boxWidth - drawW) / 2
        const drawY = boxY + (boxHeight - drawH) / 2

        doc.addImage(base64Data, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST')
      } catch (err) {
        console.warn('Could not add image to PDF:', err)
        doc.setDrawColor(220, 220, 220)
        doc.rect(margin, boxY, boxWidth, boxHeight)
        doc.setTextColor(150, 150, 150)
        doc.setFontSize(10)
        doc.text('Foto tidak dapat dimuat', pageWidth / 2, boxY + boxHeight / 2, { align: 'center' })
      }

      // Caption below photo
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(30, 30, 30)
      doc.text(`Foto #${globalIdx}: ${img.name}`, margin, boxY + boxHeight + 4)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      if (img.uploadedAt) {
        doc.text(`Waktu: ${img.uploadedAt}`, pageWidth - margin, boxY + boxHeight + 4, { align: 'right' })
      }
    }
  }

  doc.save(`Dokumentasi_Berita_Acara_${Date.now()}.pdf`)
}

function getBase64FromUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.onerror = (e) => reject(e)
    img.src = url
  })
}
