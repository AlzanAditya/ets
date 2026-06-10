/**
 * table-drawer.tsx
 *
 * Modular, generic detail/edit drawer for any data table row.
 *
 * Features:
 * - Right-side drawer (bottom on mobile) that opens on full row click
 *   (excludes checkboxes, drag handles, dropdowns, and action buttons).
 * - Expand/collapse button (round, floating on the left edge of the drawer)
 *   using ChevronLeft/ChevronRight icons.
 *   - Collapsed: single-column form layout, images below form fields.
 *   - Expanded: two-column layout — form fields left, image gallery right.
 * - Image gallery section:
 *   - Uploads are processed immediately (optimize → upload to temp session path).
 *   - Images display via signed URLs (batched + cached).
 *   - Delete button on each image.
 *   - Drag-and-drop sort order (via sort_order).
 * - Action buttons: Submit | Draft | Cancel
 *   - Submit: finalizes data to the database.
 *   - Draft: saves draft metadata to localStorage (storage_paths only, no Base64).
 *   - Cancel: closes drawer and cleans up temp session files.
 */

import * as React from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
  ImageIcon,
  Loader2Icon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { optimizeImage } from '@/lib/image-optimizer'
import {
  uploadImagePair,
  getSignedUrls,
  deleteFiles,
  cleanupTempSession,
} from '@/lib/image-service'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrawerImage {
  /** Stable DB record id — null for newly uploaded but not-yet-submitted images */
  id: string | null
  /** Storage path for the full-resolution WebP */
  storagePath: string
  /** Storage path for the thumbnail WebP */
  thumbPath: string
  /** Signed URL for the thumbnail (for gallery display) */
  thumbUrl?: string
  /** Signed URL for the full image (loaded on lightbox open) */
  fullUrl?: string
  /** Temporary browser object URL for previewing before signed URL is ready */
  previewUrl?: string
  /** Sort position */
  sortOrder: number
}

export interface TableDrawerProps {
  /** Controlled open state */
  open: boolean
  /** Called when the drawer requests to close */
  onClose: () => void
  /** Drawer header title */
  title: string
  /** Subtitle/description shown under the title */
  subtitle?: string
  /** The form fields section — passed as children */
  children: React.ReactNode
  /** Whether the product/record already exists in DB (edit mode) vs new (add mode) */
  isEditMode?: boolean
  /** Existing images (from DB product_images records) */
  initialImages?: DrawerImage[]
  /** Upload session ID — generated per drawer open, used for temp storage isolation */
  sessionId: string
  /** Called with the final image paths + sort orders when Submit or Draft is clicked */
  onImagesChange?: (images: DrawerImage[]) => void
  /** Called when Submit is clicked — the page handles the actual DB write */
  onSubmit: () => void | Promise<void>
  /** Called when Draft is clicked */
  onDraft: () => void | Promise<void>
  /** Show or hide the image section (transactions don't have images) */
  showImages?: boolean
  /** Currently submitting or saving state */
  isSubmitting?: boolean
  /** Currently saving as draft state */
  isSaving?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TableDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  isEditMode: _isEditMode = false,
  initialImages = [],
  sessionId,
  onImagesChange,
  onSubmit,
  onDraft,
  showImages = true,
  isSubmitting = false,
  isSaving = false,
}: TableDrawerProps) {
  const isMobile = useIsMobile()
  const [expanded, setExpanded] = React.useState(false)

  // ── Image state ─────────────────────────────────────────────────────────────
  const [images, setImages] = React.useState<DrawerImage[]>(initialImages)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Track previous open state to detect open→close→open transitions
  const prevOpenRef = React.useRef(false)

  // ── Re-initialize images every time the drawer is opened (fresh session) ──────
  // We compare the previous open state so this fires on rising edge (false→true)
  // regardless of which record was selected.
  React.useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open

    if (open && !wasOpen) {
      // Drawer just opened — reset to the latest initialImages and collapse
      setImages(initialImages)
      setExpanded(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load signed URLs for images that don't yet have a thumbUrl ───────────────
  React.useEffect(() => {
    if (!open || !showImages) return

    const paths = images
      .filter((img) => img.thumbPath && !img.thumbUrl)
      .map((img) => img.thumbPath)

    if (paths.length === 0) return

    getSignedUrls(paths).then((urlMap) => {
      setImages((prev) =>
        prev.map((img) =>
          img.thumbPath && urlMap[img.thumbPath]
            ? { ...img, thumbUrl: urlMap[img.thumbPath] }
            : img
        )
      )
    }).catch(console.error)
  }, [open, showImages, images.length])

  // ── Notify parent of image changes ───────────────────────────────────────────
  React.useEffect(() => {
    onImagesChange?.(images)
  }, [images]) // eslint-disable-line react-hooks/exhaustive-deps


  // ── Handle file selection & upload ───────────────────────────────────────────
  const handleFileSelect = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length === 0) return

      // Reset the input so the same file can be selected again
      e.target.value = ''

      setUploading(true)
      try {
        await Promise.all(
          files.map(async (file) => {
            // 1. Optimize: resize + compress + convert to WebP
            const optimized = await optimizeImage(file)

            // 2. Upload immediately to temp session namespace
            const prefix = `uploads/temp/${sessionId}`
            const paths = await uploadImagePair(
              optimized.full,
              optimized.thumb,
              prefix,
            )

            // 3. Add to local state with preview URL
            const newImage: DrawerImage = {
              id: null,
              storagePath: paths.fullPath,
              thumbPath: paths.thumbPath,
              previewUrl: optimized.previewUrl,
              sortOrder: images.length,
            }

            setImages((prev) => [...prev, { ...newImage, sortOrder: prev.length }])
          })
        )
      } catch (err) {
        console.error('Image upload failed:', err)
      } finally {
        setUploading(false)
      }
    },
    [sessionId, images.length]
  )

  // ── Handle image delete ───────────────────────────────────────────────────────
  const handleDeleteImage = React.useCallback(async (index: number) => {
    const img = images[index]

    // Clean up object URL if present
    if (img.previewUrl) {
      URL.revokeObjectURL(img.previewUrl)
    }

    // Remove from storage (temp or draft path)
    try {
      await deleteFiles([img.storagePath, img.thumbPath].filter(Boolean))
    } catch (err) {
      console.error('Failed to delete image from storage:', err)
    }

    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.map((img, i) => ({ ...img, sortOrder: i }))
    })
  }, [images])

  // ── Handle drawer close (cleanup temp session) ────────────────────────────────
  const handleClose = React.useCallback(async () => {
    // Revoke any preview object URLs
    images.forEach((img) => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl)
    })

    // Delete temp session files (images with no DB id are temp)
    const tempPaths = images
      .filter((img) => img.id === null)
      .flatMap((img) => [img.storagePath, img.thumbPath].filter(Boolean))

    if (tempPaths.length > 0) {
      try {
        await cleanupTempSession(sessionId)
      } catch (err) {
        console.error('Temp session cleanup failed:', err)
      }
    }

    onClose()
  }, [images, sessionId, onClose])

  // ── Expand/collapse toggle button (floating on left edge) ─────────────────────
  const ExpandButton = (
    <button
      onClick={() => setExpanded((v) => !v)}
      className={cn(
        'absolute left-0 top-1/2 z-10 flex h-10 w-5 -translate-x-full -translate-y-1/2',
        'items-center justify-center rounded-l-full',
        'bg-background border border-border border-r-0 shadow-sm',
        'text-muted-foreground hover:text-foreground transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
      aria-label={expanded ? 'Collapse drawer' : 'Expand drawer'}
    >
      {expanded
        ? <ChevronRightIcon className="size-3.5" />
        : <ChevronLeftIcon className="size-3.5" />}
    </button>
  )

  // ── Image gallery section ─────────────────────────────────────────────────────
  const ImageGallery = showImages ? (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          Foto ({images.length})
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-7 gap-1.5 text-xs"
        >
          {uploading
            ? <Loader2Icon className="size-3 animate-spin" />
            : <PlusIcon className="size-3" />}
          Tambah Foto
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleFileSelect}
        />
      </div>

      {images.length === 0 ? (
        <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground">
          <ImageIcon className="size-6 opacity-50" />
          <span className="text-xs">Belum ada foto</span>
        </div>
      ) : (
        <div
          className={cn(
            'grid gap-2',
            expanded
              ? 'grid-cols-2 xl:grid-cols-3'
              : 'grid-cols-3'
          )}
        >
          {images.map((img, index) => (
            <div
              key={img.storagePath}
              className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
            >
              <img
                src={img.previewUrl ?? img.thumbUrl ?? ''}
                alt={`Foto ${index + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => handleDeleteImage(index)}
                className={cn(
                  'absolute right-1 top-1 flex size-6 items-center justify-center rounded-full',
                  'bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity',
                  'hover:bg-destructive',
                )}
                aria-label="Hapus foto"
              >
                <Trash2Icon className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null

  // ─────────────────────────────────────────────────────────────────────────────

  const drawerWidth = expanded
    ? 'data-[vaul-drawer-direction=right]:w-[min(90vw,900px)]'
    : 'data-[vaul-drawer-direction=right]:w-[min(90vw,480px)]'

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      direction={isMobile ? 'bottom' : 'right'}
    >
      <DrawerContent
        className={cn(
          'transition-[width] duration-300',
          drawerWidth,
          'overflow-hidden',
        )}
      >
        {/* Expand/collapse button — outside the right edge of the drawer */}
        {!isMobile && ExpandButton}

        <div className="flex h-full flex-col overflow-hidden">
          {/* Header */}
          <DrawerHeader className="shrink-0 gap-0.5 border-b px-4 py-3">
            <DrawerTitle className="text-base font-semibold">
              {title}
            </DrawerTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </DrawerHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {expanded && showImages ? (
              // Expanded: two-column layout
              <div className="flex h-full divide-x">
                {/* Left — form */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="flex flex-col gap-4">
                    {children}
                  </div>
                </div>
                {/* Right — images */}
                <div className="w-80 shrink-0 overflow-y-auto px-4 py-4 xl:w-96">
                  {ImageGallery}
                </div>
              </div>
            ) : (
              // Collapsed: single-column layout
              <div className="flex flex-col gap-4 px-4 py-4">
                {children}
                {showImages && (
                  <>
                    <Separator />
                    {ImageGallery}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <DrawerFooter className="shrink-0 border-t px-4 py-3">
            <div className="flex gap-2">
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting || isSaving}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </DrawerClose>
              <Button
                type="button"
                variant="outline"
                onClick={onDraft}
                disabled={isSubmitting || isSaving}
                className="flex-1"
              >
                {isSaving && <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />}
                Draft
              </Button>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting || isSaving}
                className="flex-1"
              >
                {isSubmitting && <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />}
                Submit
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
