import * as React from 'react'
import { useRef, useState, useEffect } from 'react'

interface CropModalProps {
  src: string
  onClose: () => void
  onSave: (dataUrl: string) => void
  ratio?: number
}

export default function CropModal({
  src,
  onClose,
  onSave,
  ratio = 3 / 4,
}: CropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const im = new Image()
    im.onload = () => {
      imgRef.current = im
      draw()
    }
    im.src = src
  }, [src])

  useEffect(() => {
    draw()
  }, [zoom, pos])

  function draw() {
    const c = canvasRef.current
    const im = imgRef.current
    if (!c || !im) return
    const W = 480
    const H = Math.round(W / ratio)
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#eee'
    ctx.fillRect(0, 0, W, H)
    const scale = Math.max(W / im.width, H / im.height) * zoom
    const w = im.width * scale
    const h = im.height * scale
    ctx.drawImage(im, (W - w) / 2 + pos.x, (H - h) / 2 + pos.y, w, h)
  }

  function pointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    setDrag({ x: e.clientX - pos.x, y: e.clientY - pos.y })
  }

  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drag) return
    setPos({ x: e.clientX - drag.x, y: e.clientY - drag.y })
  }

  function save() {
    const c = canvasRef.current
    if (c) {
      onSave(c.toDataURL('image/jpeg', 0.92))
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl p-5 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-semibold text-lg">Crop Foto</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-bold text-lg"
          >
            ×
          </button>
        </div>

        <div className="overflow-hidden rounded-lg bg-black/10 flex justify-center p-2">
          <canvas
            ref={canvasRef}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={() => setDrag(null)}
            onPointerLeave={() => setDrag(null)}
            className="max-w-full h-auto cursor-grab active:cursor-grabbing rounded border border-border shadow-inner touch-none"
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <span className="text-xs font-medium text-muted-foreground">Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(+e.target.value)}
            className="flex-1 accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            onClick={() => {
              setZoom(1)
              setPos({ x: 0, y: 0 })
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-accent transition-colors"
          >
            Reset
          </button>
          <button
            onClick={save}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            Gunakan Foto
          </button>
        </div>
      </div>
    </div>
  )
}
