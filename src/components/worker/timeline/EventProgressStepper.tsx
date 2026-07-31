import * as React from "react"
import { Check, CircleDot } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StepEvent } from "../data/mock-worker-data"

export interface EventProgressStepperProps {
  mainEvent: "Instalasi" | "Maintenance"
  steps?: StepEvent[]
  currentStepIndex?: number
  onStepClick?: (step: StepEvent, index: number) => void
  className?: string
}

export const DEFAULT_INSTALASI_STEPS: string[] = [
  "Delivery",
  "Persiapan",
  "Instalasi",
  "Pengujian",
  "Serah Terima",
]

export const DEFAULT_MAINTENANCE_STEPS: string[] = [
  "Pengecekan",
  "Report",
]

export const INSTALASI_STEPS = DEFAULT_INSTALASI_STEPS
export const MAINTENANCE_STEPS = DEFAULT_MAINTENANCE_STEPS

export function EventProgressStepper({
  mainEvent,
  steps: providedSteps,
  currentStepIndex = 0,
  onStepClick,
  className,
}: EventProgressStepperProps) {
  // If steps not provided, generate from defaults
  const steps: StepEvent[] = React.useMemo(() => {
    if (providedSteps && providedSteps.length > 0) return providedSteps

    const stepNames = mainEvent === "Maintenance" ? DEFAULT_MAINTENANCE_STEPS : DEFAULT_INSTALASI_STEPS
    return stepNames.map((name, idx) => ({
      id: `step-${idx}`,
      name,
      status: idx < currentStepIndex ? "completed" : idx === currentStepIndex ? "active" : "upcoming",
    }))
  }, [providedSteps, mainEvent, currentStepIndex])

  return (
    <div className={cn("w-full py-2", className)}>
      <div className="flex items-center justify-between relative">
        {steps.map((step, idx) => {
          const isCompleted = step.status === "completed" || idx < currentStepIndex
          const isActive = step.status === "active" || idx === currentStepIndex
          const isUpcoming = !isCompleted && !isActive

          const isLast = idx === steps.length - 1

          return (
            <React.Fragment key={step.id || step.name || idx}>
              {/* Step Circle Button */}
              <div className="flex flex-col items-center group relative z-10 flex-1">
                <button
                  type="button"
                  onClick={() => onStepClick?.(step, idx)}
                  disabled={!onStepClick}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 select-none",
                    isCompleted && "bg-emerald-500 text-white shadow-xs dark:bg-emerald-600",
                    isActive && "bg-amber-500 text-slate-950 ring-4 ring-amber-500/25 animate-pulse font-extrabold shadow-sm",
                    isUpcoming && "bg-muted text-muted-foreground border border-border/80",
                    onStepClick && "cursor-pointer hover:scale-110 active:scale-95"
                  )}
                  title={`${step.name} (${isCompleted ? "Selesai" : isActive ? "Sedang Berlangsung" : "Belum Dimulai"})`}
                >
                  {isCompleted ? (
                    <Check className="size-4 stroke-[3]" />
                  ) : isActive ? (
                    <CircleDot className="size-4 stroke-[3]" />
                  ) : (
                    <span className="text-[11px] font-medium">{idx + 1}</span>
                  )}
                </button>

                {/* Step Label */}
                <span
                  className={cn(
                    "mt-1.5 text-[10px] leading-tight text-center font-medium transition-colors max-w-[65px] truncate",
                    isCompleted && "text-emerald-600 dark:text-emerald-400 font-semibold",
                    isActive && "text-amber-600 dark:text-amber-400 font-bold",
                    isUpcoming && "text-muted-foreground/70"
                  )}
                >
                  {step.name}
                </span>
              </div>

              {/* Connector Line (except for last step) */}
              {!isLast && (
                <div className="flex-1 h-[2px] mx-1 -mt-4 bg-muted overflow-hidden relative rounded-full">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      isCompleted ? "w-full bg-emerald-500" : idx === currentStepIndex ? "w-1/2 bg-amber-500" : "w-0"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
