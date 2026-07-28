import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workersService } from "@/services/workers.service";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import type { WorkerInsert, WorkerUpdate } from "@/types/database";

export function useWorkers(search?: string, positionId?: string) {
  return useQuery({
    queryKey: queryKeys.workers.list({ search, positionId }),
    queryFn: async () => {
      let data = await workersService.getWorkers();
      if (positionId && positionId !== "all") {
        data = data.filter((w) => w.position_id === positionId);
      }
      if (search && search.trim()) {
        const query = search.toLowerCase().trim();
        data = data.filter(
          (w) =>
            w.full_name.toLowerCase().includes(query) ||
            w.worker_code.toLowerCase().includes(query) ||
            (w.nickname && w.nickname.toLowerCase().includes(query)) ||
            (w.email && w.email.toLowerCase().includes(query)) ||
            (w.position?.name && w.position.name.toLowerCase().includes(query))
        );
      }
      return data;
    },
    staleTime: 1000 * 30,
  });
}

export function useWorkerPositions() {
  return useQuery({
    queryKey: queryKeys.workers.positions(),
    queryFn: () => workersService.getPositions(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useWorkerRoles() {
  return useQuery({
    queryKey: queryKeys.workers.roles(),
    queryFn: () => workersService.getRoles(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useWorker(workerId: string | null) {
  return useQuery({
    queryKey: queryKeys.workers.detail(workerId || ""),
    queryFn: () => (workerId ? workersService.getWorkerById(workerId) : null),
    enabled: Boolean(workerId),
  });
}

export function useWorkerHistory(workerId: string | null) {
  return useQuery({
    queryKey: queryKeys.workers.history(workerId || ""),
    queryFn: () => (workerId ? workersService.getWorkerHistory(workerId) : []),
    enabled: Boolean(workerId),
  });
}

export function useStepAssignments(stepId: string | null) {
  return useQuery({
    queryKey: queryKeys.workers.assignments(stepId || ""),
    queryFn: () => (stepId ? workersService.getAssignmentsByStep(stepId) : []),
    enabled: Boolean(stepId),
  });
}

export function useCreateWorkerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkerInsert>) => workersService.createWorker(data),
    onSuccess: (newWorker) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      toast.success(`Pekerja ${newWorker.full_name} berhasil ditambahkan`);
    },
    onError: (err: any) => {
      toast.error(`Gagal menambahkan pekerja: ${err.message || "Terjadi kesalahan"}`);
    },
  });
}

export function useUpdateWorkerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workerId, data }: { workerId: string; data: Partial<WorkerUpdate> }) =>
      workersService.updateWorker(workerId, data),
    onSuccess: (updatedWorker) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      toast.success(`Data pekerja ${updatedWorker.full_name} berhasil diperbarui`);
    },
    onError: (err: any) => {
      toast.error(`Gagal mengedit pekerja: ${err.message || "Terjadi kesalahan"}`);
    },
  });
}

export function useDeleteWorkerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workerId: string) => workersService.deleteWorker(workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      toast.success("Pekerja berhasil dihapus");
    },
    onError: (err: any) => {
      toast.error(`Gagal menghapus pekerja: ${err.message || "Terjadi kesalahan"}`);
    },
  });
}

export function useAssignWorkerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stepId,
      workerId,
      roleId,
      context,
    }: {
      stepId: string;
      workerId: string;
      roleId: string;
      context?: Parameters<typeof workersService.assignWorkerToStep>[3];
    }) => workersService.assignWorkerToStep(stepId, workerId, roleId, context),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      toast.success("Pekerja berhasil ditugaskan pada step ini");
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menugaskan pekerja");
    },
  });
}

export function useRemoveAssignmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => workersService.removeWorkerAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      toast.success("Penugasan pekerja berhasil dihapus");
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus penugasan");
    },
  });
}
