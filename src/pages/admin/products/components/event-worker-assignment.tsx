import * as React from "react";
import { UserPlusIcon, Trash2Icon, HardHatIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getWorkerProfilePhotoUrl } from "@/lib/image-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  useEventAssignments,
  useWorkers,
  useWorkerRoles,
  useAssignWorkerToEventMutation,
  useRemoveWorkerFromEventMutation,
} from "@/hooks/use-workers";
import type { ProductStepData } from "@/services/product-events.service";
import type { WorkerAssignmentDetail } from "@/services/workers.service";

interface EventWorkerAssignmentProps {
  eventId: string;
  eventTitle: string;
  eventType: "installation" | "maintenance";
  steps: ProductStepData[];
  productSerial?: string;
  productName?: string;
  isReadOnly?: boolean;
}

export function EventWorkerAssignment({
  eventId,
  eventTitle,
  eventType,
  steps,
  productSerial = "",
  productName = "",
  isReadOnly = false,
}: EventWorkerAssignmentProps) {
  const stepIds = React.useMemo(() => steps.map((s) => s.step_id), [steps]);
  const { data: assignments = [], isLoading } = useEventAssignments(stepIds);
  const { data: availableWorkers = [] } = useWorkers();
  const { data: roles = [] } = useWorkerRoles();

  const assignMutation = useAssignWorkerToEventMutation();
  const removeMutation = useRemoveWorkerFromEventMutation();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("");

  // Deduplicate assignments by worker_id so each worker is shown once for the Main Event
  const uniqueAssignedWorkers = React.useMemo(() => {
    const map = new Map<string, WorkerAssignmentDetail>();
    assignments.forEach((a) => {
      const wId = a.worker_id;
      if (wId && !map.has(wId)) {
        map.set(wId, a);
      }
    });
    return Array.from(map.values());
  }, [assignments]);

  const assignedWorkerIds = new Set(uniqueAssignedWorkers.map((a) => a.worker_id));
  const unassignedWorkers = availableWorkers.filter((w) => !assignedWorkerIds.has(w.worker_id));

  const handleAssign = async () => {
    if (!selectedWorkerId || !selectedRoleId) return;
    try {
      await assignMutation.mutateAsync({
        steps,
        eventId,
        eventTitle,
        eventType,
        workerId: selectedWorkerId,
        roleId: selectedRoleId,
        productSerial,
        productName,
      });
      setIsDialogOpen(false);
      setSelectedWorkerId("");
      setSelectedRoleId("");
    } catch {}
  };

  const handleRemove = async (workerId: string) => {
    try {
      await removeMutation.mutateAsync({
        stepIds,
        workerId,
      });
    } catch {}
  };

  return (
    <div className="p-3 mb-3 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
          <HardHatIcon className="size-4 text-amber-400" />
          <span>Pekerja Ditugaskan ({uniqueAssignedWorkers.length})</span>
        </div>
        {!isReadOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (roles.length > 0 && !selectedRoleId) {
                setSelectedRoleId(roles[0].role_id);
              }
              setIsDialogOpen(true);
            }}
            className="h-7 text-xs px-2.5 gap-1.5 bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
          >
            <UserPlusIcon className="size-3.5" />
            Assign Worker
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-xs text-zinc-400 py-1">Memuat daftar pekerja...</div>
      ) : uniqueAssignedWorkers.length === 0 ? (
        <div className="text-xs italic text-zinc-400 bg-zinc-950/60 rounded-lg p-2.5 text-center border border-dashed border-zinc-800">
          Belum ada pekerja ditugaskan untuk event ini. Klik "Assign Worker" untuk menugaskan pekerja.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {uniqueAssignedWorkers.map((assign) => {
            const workerName = assign.worker?.full_name || "Teknisi";
            const roleName = assign.role?.name || "Teknisi";
            const workerCode = assign.worker?.worker_code || "";
            const initials = workerName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();

            return (
              <div
                key={assign.worker_id || assign.assignment_id}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="size-7 border border-zinc-700">
                    {(() => {
                      const photoUrl = getWorkerProfilePhotoUrl(
                        assign.worker?.worker_id || assign.worker?.id || "",
                        assign.worker?.profile_photo_path || assign.worker?.profile_image_path
                      );
                      return photoUrl ? <AvatarImage src={photoUrl} alt={workerName} /> : null;
                    })()}
                    <AvatarFallback className="text-[10px] bg-amber-500/20 text-amber-400 font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-100 truncate">
                        {workerName}
                      </span>
                      {workerCode && (
                        <span className="text-[10px] font-mono text-zinc-400">
                          ({workerCode})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-400 border-amber-500/20 font-medium"
                      >
                        {roleName}
                      </Badge>
                      {assign.assigned_at && (
                        <span className="text-[10px] text-zinc-400">
                          • {new Date(assign.assigned_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(assign.worker_id)}
                    disabled={removeMutation.isPending}
                    className="size-6 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 shrink-0 ml-1 rounded-md"
                    title="Hapus penugasan worker dari event"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Assign Worker */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-zinc-100">
              <UserPlusIcon className="size-4 text-amber-400" />
              Penugasan Pekerja Event
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Pilih pekerja dan perannya untuk Event <span className="font-semibold text-zinc-200">{eventTitle}</span>. Penugasan akan berlaku untuk seluruh sub event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-200">Pilih Pekerja</Label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger className="w-full text-xs h-9 bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectValue placeholder="-- Pilih Pekerja --" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {unassignedWorkers.length === 0 ? (
                    <div className="p-2 text-xs text-zinc-400 text-center">
                      Semua pekerja telah ditugaskan.
                    </div>
                  ) : (
                    unassignedWorkers.map((w) => (
                      <SelectItem key={w.worker_id} value={w.worker_id} className="text-xs focus:bg-zinc-800 focus:text-zinc-100">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{w.full_name} ({w.worker_code})</span>
                          <span className="text-[10px] text-zinc-400">
                            {w.position?.name || "Teknisi"}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-200">Peran Dalam Event (Role)</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="w-full text-xs h-9 bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectValue placeholder="-- Pilih Role --" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {roles.map((r) => (
                    <SelectItem key={r.role_id} value={r.role_id} className="text-xs focus:bg-zinc-800 focus:text-zinc-100">
                      <div>
                        <div className="font-medium text-zinc-200">{r.name}</div>
                        {r.description && (
                          <div className="text-[10px] text-zinc-400">{r.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="text-xs bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAssign}
              disabled={!selectedWorkerId || !selectedRoleId || assignMutation.isPending}
              className="text-xs gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
            >
              <UserPlusIcon className="size-3.5" />
              Tugaskan Worker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
