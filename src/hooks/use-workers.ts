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

export function useEventAssignments(eventId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.workers.all, "event-assignments", eventId || ""],
    queryFn: () => (eventId ? workersService.getAssignmentsByEvent(eventId) : []),
    enabled: Boolean(eventId),
  });
}

export function useCreateWorkerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkerInsert>) => workersService.createWorker(data),
    onSuccess: (newWorker) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      const name = newWorker?.full_name || newWorker?.name || "Pekerja";
      toast.success(`Pekerja ${name} berhasil ditambahkan`);
    },
    onError: (err: any) => {
      const msg = err?.message || "Gagal menambahkan pekerja";
      if (msg === "Email sudah digunakan." || msg === "Kode Worker sudah digunakan.") {
        toast.error(msg);
      } else {
        toast.error(`Gagal menambahkan pekerja: ${msg}`);
      }
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
      const name = updatedWorker?.full_name || updatedWorker?.name || "Pekerja";
      toast.success(`Data pekerja ${name} berhasil diperbarui`);
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

export function useRemoveAssignmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => workersService.removeWorkerAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      toast.success("Penugasan worker berhasil dihapus");
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus penugasan");
    },
  });
}

export function useAssignWorkerToEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      eventTitle,
      eventType,
      workerId,
      roleId,
      productSerial,
      productName,
    }: {
      eventId: string;
      eventTitle: string;
      eventType: "installation" | "maintenance";
      workerId: string;
      roleId: string;
      productSerial?: string;
      productName?: string;
    }) =>
      workersService.assignWorkerToEvent(eventId, workerId, roleId, {
        event_title: eventTitle,
        event_type: eventType,
        product_serial: productSerial,
        product_name: productName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      toast.success("Worker berhasil ditugaskan pada Event ini");
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menugaskan worker");
    },
  });
}

export function useRemoveWorkerFromEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      workerId,
    }: {
      eventId: string;
      workerId: string;
    }) => workersService.removeWorkerFromEvent(eventId, workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      toast.success("Penugasan worker berhasil dihapus dari Event");
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus penugasan");
    },
  });
}
