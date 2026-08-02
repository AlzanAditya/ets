import {
  HardHatIcon,
  PhoneIcon,
  MailIcon,
  BriefcaseIcon,
  ClockIcon,
  CheckCircle2Icon,
  LayersIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getWorkerProfilePhotoUrl } from "@/lib/image-service";
import { useWorkerHistory } from "@/hooks/use-workers";
import type { WorkerWithDetails } from "@/services/workers.service";
import { cn } from "@/lib/utils";

interface WorkerDetailDialogProps {
  worker: WorkerWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkerDetailDialog({
  worker,
  open,
  onOpenChange,
}: WorkerDetailDialogProps) {
  const { data: history = [], isLoading } = useWorkerHistory(worker?.worker_id || null);

  if (!worker) return null;

  const initials = worker.full_name
    ? worker.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "WK";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <HardHatIcon className="size-5 text-amber-500" />
            Detail Worker & Riwayat Penugasan
          </DialogTitle>
          <DialogDescription className="text-xs">
            Informasi profil teknisi dan lini masa aktivitas penugasan proyek.
          </DialogDescription>
        </DialogHeader>

        {/* Header Profile Box */}
        <div className="bg-gradient-to-r from-muted/50 to-muted/20 border border-border/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-16 border-2 border-primary/20 shadow-xs shrink-0">
              {getWorkerProfilePhotoUrl(worker.worker_id || worker.id, worker.profile_photo_path || worker.profile_image_path) ? (
                <AvatarImage src={getWorkerProfilePhotoUrl(worker.worker_id || worker.id, worker.profile_photo_path || worker.profile_image_path) || undefined} alt={worker.full_name} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">{worker.full_name}</h3>
                {worker.nickname && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ("{worker.nickname}")
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                  {worker.worker_code}
                </Badge>

                <Badge
                  variant="secondary"
                  className="text-[10px] bg-primary/10 text-primary border-primary/20"
                >
                  {worker.position?.name || "Teknisi"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge
              className={cn(
                "px-2.5 py-1 text-xs font-semibold gap-1.5 shadow-2xs",
                worker.operational_status === "In Installation"
                  ? "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                  : worker.operational_status === "In Maintenance"
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                  : "bg-slate-500/15 text-slate-400 border border-slate-500/30"
              )}
            >
              <span className="size-1.5 rounded-full bg-current animate-pulse" />
              {worker.operational_status}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              Bergabung: {worker.joined_date || "-"}
            </span>
          </div>
        </div>

        {/* Quick Contact & Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-lg border border-border/50 bg-muted/30 flex flex-col">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <PhoneIcon className="size-3 text-primary" /> Telepon
            </span>
            <span className="font-medium text-foreground truncate mt-0.5">
              {worker.phone_number || "-"}
            </span>
          </div>
          <div className="p-2.5 rounded-lg border border-border/50 bg-muted/30 flex flex-col">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MailIcon className="size-3 text-primary" /> Email
            </span>
            <span className="font-medium text-foreground truncate mt-0.5">
              {worker.email || "-"}
            </span>
          </div>
          <div className="p-2.5 rounded-lg border border-border/50 bg-muted/30 flex flex-col">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <BriefcaseIcon className="size-3 text-amber-500" /> Total Assignment
            </span>
            <span className="font-bold text-foreground text-sm mt-0.5">
              {worker.total_assignments || 0} Event
            </span>
          </div>
          <div className="p-2.5 rounded-lg border border-border/50 bg-muted/30 flex flex-col">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <LayersIcon className="size-3 text-emerald-500" /> Total Event
            </span>
            <span className="font-bold text-foreground text-sm mt-0.5">
              {worker.total_events || 0} Event
            </span>
          </div>
        </div>

        {/* Assignment History Timeline */}
        <div className="mt-2 space-y-2">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <ClockIcon className="size-3.5 text-primary" />
            Riwayat Penugasan (Assignment History)
          </h4>

          {isLoading ? (
            <div className="text-xs text-muted-foreground py-4 text-center">
              Memuat riwayat penugasan...
            </div>
          ) : history.length === 0 ? (
            <div className="text-xs italic text-muted-foreground p-4 text-center border border-dashed border-border/50 rounded-lg">
              Belum ada riwayat penugasan terdaftar untuk worker ini.
            </div>
          ) : (
            <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
              {history.map((item) => {
                const isCompleted = Boolean(item.completed_at);
                const isMaintenance = item.event_type === "maintenance";

                return (
                  <div key={item.assignment_id} className="relative group">
                    {/* Circle marker */}
                    <div
                      className={cn(
                        "absolute -left-4 top-1 size-3 rounded-full border-2 bg-background transition-colors",
                        isCompleted
                          ? "border-emerald-500 bg-emerald-500"
                          : isMaintenance
                          ? "border-amber-500"
                          : "border-blue-500"
                      )}
                    />

                    <div className="p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={cn(
                              "text-[9px] uppercase px-1.5 py-0 font-bold",
                              isMaintenance
                                ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                : "bg-blue-500/15 text-blue-500 border-blue-500/30"
                            )}
                          >
                            {item.event_type || "installation"}
                          </Badge>
                          <span className="text-xs font-semibold text-foreground">
                            {item.event_title || item.event_type || "Event"}
                          </span>
                        </div>

                        <Badge variant="secondary" className="text-[9px] px-1.5 font-medium">
                          Role: {item.role?.name || "Teknisi"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/30">
                        <div>
                          {item.event_title && (
                            <span className="font-medium text-foreground">{item.event_title}</span>
                          )}
                          {item.product_serial && (
                            <span className="ml-1 font-mono text-[10px] opacity-80">
                              ({item.product_serial})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span>
                            Assigned:{" "}
                            {new Date(item.assigned_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          {isCompleted ? (
                            <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                              <CheckCircle2Icon className="size-3" /> Selesai
                            </span>
                          ) : (
                            <span className="text-amber-500 font-medium">Sedang Berjalan</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
