import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SectionBlurLoader
 * Overlays a smooth backdrop blur and individual spinner over any section
 * when data for that section is reloading/fetching.
 */
export function SectionBlurLoader({
  loading,
  label = "Memuat data...",
  children,
  className,
  spinnerSize = "md",
}: {
  loading: boolean;
  label?: string;
  children: React.ReactNode;
  className?: string;
  spinnerSize?: "sm" | "md" | "lg";
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "transition-all duration-300 ease-out",
          loading && "filter blur-[3px] opacity-40 pointer-events-none select-none"
        )}
      >
        {children}
      </div>

      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/50 backdrop-blur-[2px] rounded-2xl p-4 transition-all duration-200 animate-in fade-in">
          <div className="flex flex-col items-center justify-center gap-2.5 p-3 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-2xl">
            <Loader2
              className={cn(
                "animate-spin text-emerald-400 stroke-[2.5]",
                spinnerSize === "sm" && "h-4 w-4",
                spinnerSize === "md" && "h-6 w-6",
                spinnerSize === "lg" && "h-8 w-8"
              )}
            />
            {label && (
              <span className="text-xs font-semibold text-zinc-300 font-mono tracking-wide">
                {label}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton for Identity & Banner Section
 */
export function ProductIdentitySkeleton() {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5 sm:p-6 shadow-xl space-y-6 animate-pulse">
      {/* Top Banner Row */}
      <div className="flex flex-row items-center justify-between gap-4">
        {/* Left Info Skeleton */}
        <div className="space-y-3 flex-1 min-w-0">
          <Skeleton className="h-3 w-24 rounded-full bg-zinc-800" />
          <Skeleton className="h-8 sm:h-10 w-3/4 max-w-sm rounded-xl bg-zinc-800" />
          <Skeleton className="h-1 w-20 rounded-full bg-zinc-800" />
          <div className="pt-2">
            <Skeleton className="h-8 w-44 rounded-xl bg-zinc-800" />
          </div>
        </div>

        {/* Right Image Container Skeleton */}
        <div className="flex flex-col items-center justify-center shrink-0 w-32 sm:w-44 md:w-52 py-2">
          <Skeleton className="h-28 sm:h-36 w-24 sm:w-32 rounded-2xl bg-zinc-800" />
          <Skeleton className="h-6 w-24 rounded-full bg-zinc-800 -mt-3 z-10" />
        </div>
      </div>

      {/* 2x2 Grid Info Items */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3"
          >
            <Skeleton className="h-8 w-8 rounded-lg bg-zinc-800 shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <Skeleton className="h-2.5 w-16 bg-zinc-800" />
              <Skeleton className="h-3.5 w-24 bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Back Layer Owner Bar Skeleton */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl bg-zinc-800" />
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-20 bg-zinc-800" />
            <Skeleton className="h-4 w-32 bg-zinc-800" />
          </div>
        </div>
        <Skeleton className="h-8 w-28 rounded-xl bg-zinc-800" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Technical Specifications Card
 */
export function ProductSpecsSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-xl space-y-4 animate-pulse">
      <div className="flex items-center justify-between py-1">
        <Skeleton className="h-4 w-28 bg-zinc-800" />
        <Skeleton className="h-4 w-4 rounded-full bg-zinc-800" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="p-2.5 sm:p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-2.5"
          >
            <Skeleton className="h-4 w-4 rounded-md bg-zinc-800 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <Skeleton className="h-2.5 w-20 bg-zinc-800" />
              <Skeleton className="h-3.5 w-24 bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for Report Card
 */
export function ProductReportSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-xl space-y-4 animate-pulse">
      <div className="flex items-center justify-between py-1">
        <Skeleton className="h-4 w-24 bg-zinc-800" />
        <Skeleton className="h-4 w-4 rounded-full bg-zinc-800" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-4 w-4 rounded bg-zinc-800" />
              <Skeleton className="h-3 w-20 bg-zinc-800" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for Documentation & Events Accordion
 */
export function ProductEventsSkeleton() {
  return (
    <div className="space-y-3 pt-2 animate-pulse">
      <Skeleton className="h-4 w-32 bg-zinc-800" />
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full bg-zinc-800" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 bg-zinc-800" />
                  <Skeleton className="h-2.5 w-24 bg-zinc-800" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full bg-zinc-800" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
              {[1, 2, 3, 4].map((img) => (
                <Skeleton key={img} className="aspect-square rounded-xl bg-zinc-800" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for QR Code Card
 */
export function ProductQrSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-xl space-y-3 animate-pulse">
      <div className="flex items-center justify-between py-1">
        <Skeleton className="h-4 w-24 bg-zinc-800" />
        <Skeleton className="h-4 w-4 rounded-full bg-zinc-800" />
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-2">
        <Skeleton className="h-40 w-40 rounded-2xl bg-zinc-800 shrink-0" />
        <div className="flex-1 space-y-2.5 w-full text-center sm:text-left">
          <Skeleton className="h-3 w-48 bg-zinc-800 mx-auto sm:mx-0" />
          <Skeleton className="h-8 w-full rounded-xl bg-zinc-800" />
          <div className="flex gap-2 justify-center sm:justify-start pt-1">
            <Skeleton className="h-9 w-28 rounded-xl bg-zinc-800" />
            <Skeleton className="h-9 w-28 rounded-xl bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Complete Full Page Skeleton for Product Detail
 */
export function FullProductDetailSkeleton() {
  return (
    <div className="space-y-6">
      <ProductIdentitySkeleton />
      <ProductSpecsSkeleton />
      <ProductReportSkeleton />
      <ProductEventsSkeleton />
      <ProductQrSkeleton />
    </div>
  );
}
