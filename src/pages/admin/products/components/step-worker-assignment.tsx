import * as React from "react";
import { UserPlusIcon, Trash2Icon, HardHatIcon } from "lucide-react";
import { toast } from "sonner";
import { isValidUUID } from "@/lib/utils";
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
  useStepAssignments,
  useWorkers,
  useWorkerRoles,
  useAssignWorkerMutation,
  useRemoveAssignmentMutation,
} from "@/hooks/use-workers";

interface StepWorkerAssignmentProps {
  stepId: string;
  eventType: "installation" | "maintenance";
  stepType: string;
  stepTitle: string;
  eventTitle: string;
  productSerial?: string;
  productName?: string;
  isReadOnly?: boolean;
}

export function StepWorkerAssignment({
  stepId,
  eventType,
  stepType,
  stepTitle,
  eventTitle,
  productSerial = "",
  productName = "",
  isReadOnly = false,
}: StepWorkerAssignmentProps) {
  const { data: assignments = [], isLoading } = useStepAssignments(stepId);
  const { data: availableWorkers = [] } = useWorkers();
  const { data: roles = [] } = useWorkerRoles();

  const assignMutation = useAssignWorkerMutation();
  const removeMutation = useRemoveAssignmentMutation();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("");

  // Filter out workers already assigned to this step
  const assignedWorkerIds = new Set(assignments.map((a) => a.worker_id));
  const unassignedWorkers = availableWorkers.filter((w) => !assignedWorkerIds.has(w.worker_id));

  const handleAssign = async () => {
    if (!selectedWorkerId) {
      toast.error("Silakan pilih pekerja terlebih dahulu.");
      return;
    }
    if (roles.length === 0) {
      toast.error("Worker roles belum tersedia. Silakan hubungi administrator untuk mengisi master data worker roles.");
      return;
    }
    if (!selectedRoleId || !isValidUUID(selectedRoleId)) {
      toast.error("Role ID tidak valid. Silakan pilih role yang valid.");
      return;
    }

    const selectedRole = roles.find((r) => r.role_id === selectedRoleId);
    console.log("Worker Roles dari DB", roles);
    console.log("Selected Role", selectedRole);
    console.log("Selected Role UUID", selectedRole?.role_id);

    try {
      await assignMutation.mutateAsync({
        stepId,
        workerId: selectedWorkerId,
        roleId: selectedRoleId,
        context: {
          event_type: eventType,
          step_type: stepType,
          step_title: stepTitle,
          event_title: eventTitle,
          product_serial: productSerial,
          product_name: productName,
        },
      });
      toast.success("Pekerja berhasil ditugaskan ke step.");
      setIsDialogOpen(false);
      setSelectedWorkerId("");
      setSelectedRoleId("");
    } catch (err: any) {
      toast.error(err.message || "Gagal menugaskan pekerja.");
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      await removeMutation.mutateAsync(assignmentId);
    } catch {}
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <HardHatIcon className="size-3.5 text-amber-500" />
          <span>Pekerja Ditugaskan ({assignments.length})</span>
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
            className="h-7 text-[11px] px-2 gap-1"
          >
            <UserPlusIcon className="size-3" />
            Assign Worker
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground py-1">Memuat daftar pekerja...</div>
      ) : assignments.length === 0 ? (
        <div className="text-xs italic text-muted-foreground bg-muted/20 rounded p-2 text-center border border-dashed border-border/40">
          Belum ada pekerja ditugaskan untuk tahapan ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {assignments.map((assign) => {
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
                key={assign.assignment_id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="size-7 border border-border/50">
                    {(() => {
                      const photoUrl = getWorkerProfilePhotoUrl(assign.worker?.worker_id || assign.worker?.id || "", assign.worker?.profile_photo_path || assign.worker?.profile_image_path);
                      return photoUrl ? <AvatarImage src={photoUrl} alt={workerName} /> : null;
                    })()}
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground truncate">
                        {workerName}
                      </span>
                      {workerCode && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          ({workerCode})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium"
                      >
                        {roleName}
                      </Badge>
                      {assign.assigned_at && (
                        <span className="text-[10px] text-muted-foreground">
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
                    onClick={() => handleRemove(assign.assignment_id)}
                    disabled={removeMutation.isPending}
                    className="size-6 text-muted-foreground hover:text-destructive shrink-0 ml-1"
                    title="Hapus penugasan"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserPlusIcon className="size-4 text-amber-500" />
              Penugasan Pekerja
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pilih pekerja dan perannya untuk tahapan <span className="font-semibold text-foreground">{stepTitle}</span> ({eventTitle}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Pilih Pekerja</Label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="-- Pilih Pekerja --" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedWorkers.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      Semua pekerja telah ditugaskan.
                    </div>
                  ) : (
                    unassignedWorkers.map((w) => (
                      <SelectItem key={w.worker_id} value={w.worker_id} className="text-xs">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{w.full_name} ({w.worker_code})</span>
                          <span className="text-[10px] text-muted-foreground">
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
              <Label className="text-xs font-semibold">Peran Dalam Step (Role)</Label>
              {roles.length === 0 ? (
                <div className="p-2.5 rounded-lg text-xs bg-amber-500/10 border border-amber-500/30 text-amber-500">
                  Worker roles belum tersedia. Silakan hubungi administrator untuk mengisi master data worker roles.
                </div>
              ) : (
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger className="w-full text-xs h-9">
                    <SelectValue placeholder="-- Pilih Role --" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.role_id} value={r.role_id} className="text-xs">
                        <div>
                          <div className="font-medium">{r.name}</div>
                          {r.description && (
                            <div className="text-[10px] text-muted-foreground">{r.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAssign}
              disabled={!selectedWorkerId || !selectedRoleId || assignMutation.isPending}
              className="text-xs gap-1.5"
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
