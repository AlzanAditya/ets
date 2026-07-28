import { Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteWorkerMutation } from "@/hooks/use-workers";
import type { WorkerWithDetails } from "@/services/workers.service";

interface WorkerDeleteDialogProps {
  worker: WorkerWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkerDeleteDialog({
  worker,
  open,
  onOpenChange,
}: WorkerDeleteDialogProps) {
  const deleteMutation = useDeleteWorkerMutation();

  if (!worker) return null;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(worker.worker_id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2Icon className="size-5" />
            Hapus Data Worker
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            Apakah Anda yakin ingin menghapus data worker{" "}
            <span className="font-bold text-foreground">{worker.full_name}</span> (
            <span className="font-mono text-foreground">{worker.worker_code}</span>)?
            Tindakan ini juga akan menghapus penugasan aktif dari worker tersebut.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="text-xs">Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Hapus Worker
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
