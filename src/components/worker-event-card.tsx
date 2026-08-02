import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkerEventCardProps {
  eventId?: string;
  eventTitle: string;
  eventType: "installation" | "maintenance" | string;
  eventTypeLabel?: string;
  clientId?: string;
  clientName?: string;
  productName?: string;
  serialNumber?: string;
  date: string;
  className?: string;
  onNavigateClient?: (clientId?: string) => void;
  onNavigateProduct?: (serialNumber: string) => void;
}

export function WorkerEventCard({
  eventTitle,
  eventType,
  eventTypeLabel,
  clientId,
  clientName,
  productName,
  serialNumber,
  date,
  className,
  onNavigateClient,
  onNavigateProduct,
}: WorkerEventCardProps) {
  const navigate = useNavigate();

  const isInstallation =
    eventType === "installation" || eventTypeLabel?.toLowerCase() === "instalasi";
  const label = eventTypeLabel || (isInstallation ? "Instalasi" : "Maintenance");

  const handleClientClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigateClient) {
      onNavigateClient(clientId);
    } else {
      navigate(clientId ? `/clients/${encodeURIComponent(clientId)}` : "/clients");
    }
  };

  const handleProductClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (serialNumber) {
      if (onNavigateProduct) {
        onNavigateProduct(serialNumber);
      } else {
        navigate(`/products/${encodeURIComponent(serialNumber)}`);
      }
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 text-xs p-3.5 rounded-xl bg-muted/30 border border-border/60 hover:border-border transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-foreground overflow-hidden">
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0 shrink-0",
              isInstallation
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            )}
          >
            {label}
          </Badge>
          <span className="truncate max-w-[200px] sm:max-w-[320px]" title={eventTitle}>
            {eventTitle}
          </span>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground text-[11px] font-normal shrink-0">
          <Calendar className="size-3 text-muted-foreground/70" />
          <span>{date}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/40">
        {/* Client Name link */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-muted-foreground text-[11px] shrink-0">Client:</span>
          <button
            type="button"
            onClick={handleClientClick}
            className="font-bold text-primary hover:underline inline-flex items-center gap-1 text-xs cursor-pointer truncate"
            title="Direct ke Halaman Client"
          >
            <Building2 className="size-3 text-primary/80 shrink-0" />
            <span className="truncate">{clientName || "Klien Utama"}</span>
          </button>
        </div>

        {/* Serial Number link */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-muted-foreground text-[11px] shrink-0">Serial:</span>
          {serialNumber ? (
            <button
              type="button"
              onClick={handleProductClick}
              className="font-mono font-semibold text-foreground/90 hover:text-primary hover:underline inline-flex items-center gap-1 text-xs cursor-pointer bg-background/80 px-2 py-0.5 rounded border border-border/60 truncate"
              title={productName ? `${productName} (${serialNumber})` : "Direct ke Detail Perangkat"}
            >
              <Package className="size-3 text-muted-foreground shrink-0" />
              <span className="truncate">{serialNumber}</span>
            </button>
          ) : (
            <span className="text-muted-foreground font-mono text-xs">—</span>
          )}
        </div>
      </div>
    </div>
  );
}
