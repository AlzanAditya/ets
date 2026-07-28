import * as React from "react";
import { HardHatIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWorkerPositions, useCreateWorkerMutation, useUpdateWorkerMutation } from "@/hooks/use-workers";
import type { WorkerWithDetails } from "@/services/workers.service";

interface WorkerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerToEdit?: WorkerWithDetails | null;
}

export function WorkerFormDialog({
  open,
  onOpenChange,
  workerToEdit = null,
}: WorkerFormDialogProps) {
  const { data: positions = [] } = useWorkerPositions();
  const createMutation = useCreateWorkerMutation();
  const updateMutation = useUpdateWorkerMutation();

  const isEdit = Boolean(workerToEdit);

  const [fullName, setFullName] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [workerCode, setWorkerCode] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [positionId, setPositionId] = React.useState("");
  const [joinedDate, setJoinedDate] = React.useState("");
  const [avatarPath, setAvatarPath] = React.useState("");

  React.useEffect(() => {
    if (!open) return;

    if (workerToEdit) {
      setFullName(workerToEdit.full_name || "");
      setNickname(workerToEdit.nickname || "");
      setWorkerCode(workerToEdit.worker_code || "");
      setPhone(workerToEdit.phone_number || "");
      setEmail(workerToEdit.email || "");
      setPositionId(workerToEdit.position_id || (positions[0]?.position_id ?? "pos-2"));
      setJoinedDate(workerToEdit.joined_date || new Date().toISOString().split("T")[0]);
      setAvatarPath(workerToEdit.profile_image_path || "");
    } else {
      setFullName("");
      setNickname("");
      setWorkerCode(`WKR-${Math.floor(100 + Math.random() * 900)}`);
      setPhone("");
      setEmail("");
      setPositionId(positions[0]?.position_id || "pos-2");
      setJoinedDate(new Date().toISOString().split("T")[0]);
      setAvatarPath("");
    }
  }, [open, workerToEdit]);

  React.useEffect(() => {
    if (open && !positionId && positions.length > 0) {
      setPositionId(positions[0].position_id);
    }
  }, [open, positionId, positions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    if (isEdit && workerToEdit) {
      await updateMutation.mutateAsync({
        workerId: workerToEdit.worker_id,
        data: {
          full_name: fullName.trim(),
          nickname: nickname.trim() || null,
          worker_code: workerCode.trim(),
          phone_number: phone.trim() || null,
          email: email.trim() || null,
          position_id: positionId || null,
          joined_date: joinedDate || null,
          profile_image_path: avatarPath.trim() || null,
        },
      });
    } else {
      await createMutation.mutateAsync({
        full_name: fullName.trim(),
        nickname: nickname.trim() || null,
        worker_code: workerCode.trim(),
        phone_number: phone.trim() || null,
        email: email.trim() || null,
        position_id: positionId || null,
        joined_date: joinedDate || null,
        profile_image_path: avatarPath.trim() || null,
      });
    }
    onOpenChange(false);
  };

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "WK";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <HardHatIcon className="size-5 text-amber-500" />
              {isEdit ? "Edit Data Pekerja" : "Tambah Pekerja Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Isi data detail pekerja teknis / tim lapangan untuk penugasan modul instalasi & maintenance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Profile Avatar & Image Path */}
            <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-lg border border-border/50">
              <Avatar className="size-14 border border-border">
                {avatarPath ? <AvatarImage src={avatarPath} alt={fullName} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 flex-1">
                <Label htmlFor="avatarPath" className="text-xs font-semibold">
                  URL Foto Profil / Foto Avatar
                </Label>
                <Input
                  id="avatarPath"
                  placeholder="https://... atau path foto"
                  value={avatarPath}
                  onChange={(e) => setAvatarPath(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="workerCode" className="text-xs font-semibold">
                  Kode Worker <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="workerCode"
                  required
                  value={workerCode}
                  onChange={(e) => setWorkerCode(e.target.value)}
                  placeholder="e.g. WKR-001"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="joinedDate" className="text-xs font-semibold">
                  Tanggal Bergabung
                </Label>
                <Input
                  id="joinedDate"
                  type="date"
                  value={joinedDate}
                  onChange={(e) => setJoinedDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="fullName" className="text-xs font-semibold">
                  Nama Lengkap <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  required
                  placeholder="e.g. Budi Santoso"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nickname" className="text-xs font-semibold">
                  Panggilan
                </Label>
                <Input
                  id="nickname"
                  placeholder="e.g. Budi"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="position" className="text-xs font-semibold">
                Jabatan Pekerja <span className="text-destructive">*</span>
              </Label>
              <Select value={positionId} onValueChange={setPositionId}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="Pilih Jabatan" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos.position_id} value={pos.position_id} className="text-xs">
                      <div>
                        <span className="font-medium">{pos.name}</span>
                        {pos.description && (
                          <span className="text-[10px] text-muted-foreground ml-2">
                            ({pos.description})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs font-semibold">
                  Nomor Telepon / WA
                </Label>
                <Input
                  id="phone"
                  placeholder="0812-xxxx-xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="budi@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="text-xs"
            >
              {isEdit ? "Simpan Perubahan" : "Tambah Worker"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
