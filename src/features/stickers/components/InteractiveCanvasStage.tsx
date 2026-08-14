import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PreviewTab, StickerData, StickerConfig, LayoutStats } from '../types';
import { SingleStickerStage } from './SingleStickerStage';
import { A4PrintLayoutStage } from './A4PrintLayoutStage';
import { RotateCcw, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractiveCanvasStageProps {
  activeTab: PreviewTab;
  currentSticker: StickerData;
  selectedProducts: StickerData[];
  activeProductIndex: number;
  setActiveProductIndex: (index: number) => void;
  config: StickerConfig;
  layoutStats: LayoutStats;
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
  onResetZoomAndPan: () => void;
  a4ContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const InteractiveCanvasStage: React.FC<InteractiveCanvasStageProps> = ({
  activeTab,
  currentSticker,
  selectedProducts,
  activeProductIndex,
  setActiveProductIndex,
  config,
  layoutStats,
  zoomLevel,
  onZoomChange,
  onResetZoomAndPan,
  a4ContainerRef,
}) => {
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Refs for tracking drag and pinch gestures without stale closures
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const pinchStartRef = useRef<{
    dist: number;
    startZoom: number;
    centerX: number;
    centerY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  // Reset pan when reset callback is triggered
  const handleRecenter = useCallback(() => {
    setPan({ x: 0, y: 0 });
    onResetZoomAndPan();
  }, [onResetZoomAndPan]);

  // ── MOUSE DRAG / PAN HANDLERS ──
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag on left click and ignore clicks on buttons or dropdowns
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, [role="button"]')) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.startPanX + dx,
      y: dragStartRef.current.startPanY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ── WHEEL ZOOM & PAN HANDLER ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent default page scroll inside canvas area
      e.preventDefault();

      if (e.ctrlKey || e.metaKey || !e.shiftKey) {
        // Zooming via wheel
        const zoomDelta = e.deltaY < 0 ? 10 : -10;
        const newZoom = Math.min(400, Math.max(15, zoomLevel + zoomDelta));
        onZoomChange(newZoom);
      } else {
        // Panning via horizontal/vertical wheel
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [zoomLevel, onZoomChange]);

  // ── TOUCH PINCH & PAN GESTURES (MOBILE) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, [role="button"]')) return;

      if (e.touches.length === 1) {
        // 1-finger touch pan
        setIsDragging(true);
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          startPanX: pan.x,
          startPanY: pan.y,
        };
        pinchStartRef.current = null;
      } else if (e.touches.length === 2) {
        // 2-finger touch pinch-to-zoom + pan
        setIsDragging(false);
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const centerX = (t1.clientX + t2.clientX) / 2;
        const centerY = (t1.clientY + t2.clientY) / 2;

        pinchStartRef.current = {
          dist,
          startZoom: zoomLevel,
          centerX,
          centerY,
          startPanX: pan.x,
          startPanY: pan.y,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent browser default gesture scrolling on the canvas
      if (e.cancelable) e.preventDefault();

      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - dragStartRef.current.x;
        const dy = e.touches[0].clientY - dragStartRef.current.y;
        setPan({
          x: dragStartRef.current.startPanX + dx,
          y: dragStartRef.current.startPanY + dy,
        });
      } else if (e.touches.length === 2 && pinchStartRef.current) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const ratio = currentDist / pinchStartRef.current.dist;

        const newZoom = Math.min(
          400,
          Math.max(15, Math.round(pinchStartRef.current.startZoom * ratio))
        );
        onZoomChange(newZoom);

        // Also track 2-finger pan
        const currentCenterX = (t1.clientX + t2.clientX) / 2;
        const currentCenterY = (t1.clientY + t2.clientY) / 2;
        const dx = currentCenterX - pinchStartRef.current.centerX;
        const dy = currentCenterY - pinchStartRef.current.centerY;

        setPan({
          x: pinchStartRef.current.startPanX + dx,
          y: pinchStartRef.current.startPanY + dy,
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        setIsDragging(false);
        pinchStartRef.current = null;
      } else if (e.touches.length === 1) {
        // Switched from 2 fingers to 1 finger
        setIsDragging(true);
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          startPanX: pan.x,
          startPanY: pan.y,
        };
        pinchStartRef.current = null;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, pan, zoomLevel, onZoomChange]);

  const hasPanned = pan.x !== 0 || pan.y !== 0;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleRecenter}
      style={{ touchAction: 'none' }}
      className={cn(
        'relative w-full h-[540px] sm:h-[620px] lg:h-[calc(100vh-175px)] rounded-2xl overflow-hidden select-none border border-border/80 transition-colors',
        'bg-zinc-950/90 shadow-inner',
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      )}
    >
      {/* Subtle Blueprint/Dot Grid Canvas Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: `${pan.x % 24}px ${pan.y % 24}px`,
        }}
      />

      {/* Floating Canvas Quick Controls (Bottom Center/Right) */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-20 flex items-center justify-between sm:justify-start gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-md text-[11px] font-medium text-zinc-300 shadow-md">
          <Move className="size-3 text-primary animate-pulse" />
          <span className="hidden sm:inline">Geser & Pinch untuk Zoom Bebas</span>
          <span className="sm:hidden">Pinch & Drag Kanvas</span>
          <span className="text-zinc-500 font-mono">|</span>
          <span className="font-mono font-bold text-zinc-100">{zoomLevel}%</span>
        </div>

        {hasPanned && (
          <button
            type="button"
            onClick={handleRecenter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 backdrop-blur-md text-[11px] font-medium text-zinc-200 shadow-md transition-all cursor-pointer hover:text-white"
            title="Pusatkan Kembali Kanvas (Double Click)"
          >
            <RotateCcw className="size-3 text-emerald-400" />
            <span>Reset Posisi</span>
          </button>
        )}
      </div>

      {/* Transformable Canvas Artboard Layer (Infinite Pan & Zoom) */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoomLevel / 100})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        <div className="pointer-events-auto flex items-center justify-center p-8">
          {activeTab === 'single' ? (
            <SingleStickerStage
              currentSticker={currentSticker}
              selectedProducts={selectedProducts}
              activeProductIndex={activeProductIndex}
              setActiveProductIndex={setActiveProductIndex}
              config={config}
              zoomLevel={100}
            />
          ) : (
            <A4PrintLayoutStage
              selectedProducts={selectedProducts}
              currentSticker={currentSticker}
              config={config}
              layoutStats={layoutStats}
              zoomLevel={100}
              containerRef={a4ContainerRef}
            />
          )}
        </div>
      </div>
    </div>
  );
};
