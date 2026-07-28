import * as React from "react";
import {
  HardHatIcon,
  PencilIcon,
  UploadIcon,
  Trash2Icon,
  Loader2Icon,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useWorkerPositions,
  useCreateWorkerMutation,
  useUpdateWorkerMutation,
} from "@/hooks/use-workers";
import { optimizeAvatarImage } from "@/lib/image-optimizer";
import {
  uploadWorkerProfilePhoto,
  deleteWorkerProfilePhoto,
} from "@/lib/image-service";
import { safeUUID } from "@/lib/utils";
import type { WorkerWithDetails } from "@/services/workers.service";
import { toast } from "sonner";

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
  const [status, setStatus] = React.useState("active");
  const [notes, setNotes] = React.useState("");

  // Avatar state
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [isAvatarRemoved, setIsAvatarRemoved] = React.useState(false);
  const [isProcessingImage, setIsProcessingImage] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    setIsAvatarRemoved(false);
    setPendingFile(null);
    setIsProcessingImage(false);

    if (workerToEdit) {
      setFullName(workerToEdit.full_name || workerToEdit.name || "");
      setNickname(workerToEdit.nickname || "");
      setWorkerCode(workerToEdit.worker_code || "");
      setPhone(workerToEdit.phone_number || "");
      setEmail(workerToEdit.email || "");
      setPositionId(workerToEdit.position_id || (positions[0]?.position_id ?? "pos-2"));
      setJoinedDate(workerToEdit.joined_date || new Date().toISOString().split("T")[0]);
      setStatus(workerToEdit.status || "active");
      setNotes(workerToEdit.notes || "");
      setAvatarUrl(workerToEdit.profile_photo_path || workerToEdit.profile_image_path || null);
    } else {
      setFullName("");
      setNickname("");
      setWorkerCode(`WKR-${Math.floor(100 + Math.random() * 900)}`);
      setPhone("");
      setEmail("");
      setPositionId(positions[0]?.position_id || "pos-2");
      setJoinedDate(new Date().toISOString().split("T")[0]);
      setStatus("active");
      setNotes("");
      setAvatarUrl(null);
    }
  }, [open, workerToEdit]);

  React.useEffect(() => {
    if (open && !positionId && positions.length > 0) {
      setPositionId(positions[0].position_id);
    }
  }, [open, positionId, positions]);

  // Handle local image file selection & 300x300 WebP optimization
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG, PNG, WebP)");
      return;
    }

    try {
      setIsProcessingImage(true);
      // Convert to 300x300 WebP square
      const { file: optimizedFile, previewUrl } = await optimizeAvatarImage(file, 300);

      setPendingFile(optimizedFile);
      setAvatarUrl(previewUrl);
      setIsAvatarRemoved(false);
      toast.success("Foto profil dikonversi ke 300x300 WebP");
    } catch (err: any) {
      console.error("Gagal memproses gambar:", err);
      toast.error("Gagal mengompres gambar foto profil");
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    setPendingFile(null);
    setIsAvatarRemoved(true);
    toast.info("Foto profil akan dihapus saat disimpan");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    try {
      setIsUploading(true);

      if (isEdit && workerToEdit) {
        const workerId = workerToEdit.worker_id;
        let finalPhotoPath = workerToEdit.profile_photo_path || workerToEdit.profile_image_path || null;

        if (pendingFile) {
          // Upload to worker-profiles bucket
          finalPhotoPath = await uploadWorkerProfilePhoto(workerId, pendingFile);
        } else if (isAvatarRemoved) {
          // Remove file from storage
          await deleteWorkerProfilePhoto(workerId);
          finalPhotoPath = null;
        }

        await updateMutation.mutateAsync({
          workerId,
          data: {
            full_name: fullName.trim(),
            name: fullName.trim(),
            nickname: nickname.trim() || null,
            worker_code: workerCode.trim(),
            phone_number: phone.trim() || null,
            email: email.trim() || null,
            position_id: positionId || null,
            joined_date: joinedDate || null,
            status: status || "active",
            notes: notes.trim() || null,
            profile_photo_path: finalPhotoPath,
            profile_image_path: finalPhotoPath,
          },
        });
      } else {
        const newWorkerId = safeUUID();
        let finalPhotoPath: string | null = null;

        if (pendingFile) {
          finalPhotoPath = await uploadWorkerProfilePhoto(newWorkerId, pendingFile);
        }

        await createMutation.mutateAsync({
          worker_id: newWorkerId,
          id: newWorkerId,
          full_name: fullName.trim(),
          name: fullName.trim(),
          nickname: nickname.trim() || null,
          worker_code: workerCode.trim(),
          phone_number: phone.trim() || null,
          email: email.trim() || null,
          position_id: positionId || null,
          joined_date: joinedDate || null,
          status: status || "active",
          notes: notes.trim() || null,
          profile_photo_path: finalPhotoPath,
          profile_image_path: finalPhotoPath,
        });
      }

      onOpenChange(false);
    } catch (err: any) {
      console.error("Gagal menyimpan data worker:", err);
      toast.error(err.message || "Gagal menyimpan data worker");
    } finally {
      setIsUploading(false);
    }
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

          <div className="space-y-5 py-4">
            {/* Worker Profile Header Component (Matches Client Edit Mode UX) */}
            <div className="flex flex-col sm:flex-row items-center gap-5 bg-card border border-border/70 rounded-2xl p-4 shadow-2xs">
              <div className="relative size-[86px] rounded-full shrink-0 border-2 border-border/80 bg-muted/40 flex items-center justify-center group shadow-xs">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || "Worker Avatar"}
                    className="size-[82px] rounded-full object-cover"
                  />
                ) : (
                  <div className="size-[82px] rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold tracking-wider select-none">
                    {initials}
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={isProcessingImage}
                      className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform cursor-pointer border-2 border-background disabled:opacity-50"
                      title="Ubah foto profil"
                    >
                      {isProcessingImage ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <PencilIcon className="size-3.5" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 rounded-xl">
                    <DropdownMenuItem
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer gap-2"
                    >
                      <UploadIcon className="size-4" />
                      <span>{avatarUrl ? "Ganti Foto Profil" : "Unggah Foto Profil"}</span>
                    </DropdownMenuItem>
                    {avatarUrl && (
                      <DropdownMenuItem
                        onClick={handleRemoveAvatar}
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2Icon className="size-4" />
                        <span>Hapus Foto Profil</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-base font-bold tracking-tight text-foreground truncate">
                    {fullName || "Nama Pekerja"}
                  </h3>
                </div>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {workerCode ? `Kode Worker: ${workerCode}` : "Worker Baru"}
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">
                  Format otomatis dikonversi ke 300x300 WebP dan disimpan di bucket{" "}
                  <code className="text-primary font-mono text-[10px]">worker-profiles</code>.
                </p>
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

            <div className="grid grid-cols-2 gap-3">
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
                        <span className="font-medium">{pos.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="status" className="text-xs font-semibold">
                  Status Aktif
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs">Aktif</SelectItem>
                    <SelectItem value="inactive" className="text-xs">Non-Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Catatan / Keterangan
              </Label>
              <textarea
                id="notes"
                placeholder="Catatan keahlian, lisensi, atau pengalaman pekerja..."
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
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
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                isProcessingImage ||
                isUploading
              }
              className="text-xs gap-1.5"
            >
              {isUploading && <Loader2Icon className="size-3.5 animate-spin" />}
              {isEdit ? "Simpan Perubahan" : "Tambah Worker"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
