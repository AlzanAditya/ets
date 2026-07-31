import * as React from "react";
import {
  HardHatIcon,
  PencilIcon,
  ArrowLeftIcon,
  UploadIcon,
  Trash2Icon,
  Loader2Icon,
  UserIcon,
  CheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useWorkerPositions } from "@/hooks/use-workers";
import type { WorkerWithDetails } from "@/services/workers.service";

interface WorkerEditModeProps {
  editTarget: WorkerWithDetails | null;
  fullName: string;
  setFullName: (val: string) => void;
  nickname: string;
  setNickname: (val: string) => void;
  workerCode: string;
  setWorkerCode: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  password?: string;
  setPassword?: (val: string) => void;
  positionId: string;
  setPositionId: (val: string) => void;
  joinedDate: string;
  setJoinedDate: (val: string) => void;
  status: string;
  setStatus: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  avatarUrl: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAvatar: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function WorkerEditMode({
  editTarget,
  fullName,
  setFullName,
  nickname,
  setNickname,
  workerCode,
  setWorkerCode,
  phone,
  setPhone,
  email,
  setEmail,
  password = "",
  setPassword,
  positionId,
  setPositionId,
  joinedDate,
  setJoinedDate,
  status,
  setStatus,
  notes,
  setNotes,
  avatarUrl,
  fileInputRef,
  handleFileChange,
  handleRemoveAvatar,
  onSubmit,
  onCancel,
  isSubmitting,
}: WorkerEditModeProps) {
  const { data: positions = [] } = useWorkerPositions();

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "WK";

  return (
    <form onSubmit={onSubmit} className="max-w-4xl mx-auto px-4 lg:px-6 w-full space-y-6 pb-28">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HardHatIcon className="size-5 text-amber-500" />
            {editTarget ? "Edit Profile Worker" : "Tambah Worker Baru"}
          </h2>
          {editTarget && (
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Kode Worker: <span className="font-semibold text-foreground">{editTarget.worker_code}</span>
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" type="button" onClick={onCancel} className="gap-1.5 rounded-xl">
          <ArrowLeftIcon className="size-3.5" />
          Batal
        </Button>
      </div>

      {/* Worker Avatar Editor Banner */}
      <div className="flex flex-col sm:flex-row items-center gap-5 bg-card border rounded-2xl p-5 shadow-2xs">
        <div className="relative size-[90px] rounded-full shrink-0 border-2 border-border/80 bg-muted/40 flex items-center justify-center group shadow-sm">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName || "Worker Avatar"}
              className="size-[86px] rounded-full object-cover"
            />
          ) : (
            <div className="size-[86px] rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold tracking-wider select-none">
              {initials}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform cursor-pointer border-2 border-background"
                title="Ubah foto profil"
              >
                <PencilIcon className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-xl">
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer gap-2 text-xs"
              >
                <UploadIcon className="size-4" />
                <span>{avatarUrl ? "Ganti Foto Profil" : "Unggah Foto Profil"}</span>
              </DropdownMenuItem>
              {avatarUrl && (
                <DropdownMenuItem
                  onClick={handleRemoveAvatar}
                  className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
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

        <div className="text-center sm:text-left space-y-1">
          <h3 className="font-semibold text-base text-foreground">
            Foto Profil Worker
          </h3>
          <p className="text-xs text-muted-foreground max-w-md">
            Gunakan foto wajah yang jelas dan profesional. Otomatis dikonversi ke format 300x300 WebP.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 text-xs h-8 gap-1.5 rounded-xl"
          >
            <UploadIcon className="size-3.5" />
            Pilih Foto
          </Button>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="bg-card border rounded-2xl p-5 md:p-6 shadow-2xs space-y-4">
        <h3 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2 border-b pb-3">
          <UserIcon className="size-4 text-primary" />
          Informasi Utama &amp; Kontak
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="edit-worker-code" className="text-xs font-semibold">
              Kode Worker <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-worker-code"
              value={workerCode}
              onChange={(e) => setWorkerCode(e.target.value)}
              placeholder="WKR-001"
              className="h-9 font-mono text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-full-name" className="text-xs font-semibold">
              Nama Lengkap <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-nickname" className="text-xs font-semibold">
              Nama Panggilan (Nickname)
            </Label>
            <Input
              id="edit-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Contoh: Budi"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-position" className="text-xs font-semibold">
              Jabatan / Posisi <span className="text-destructive">*</span>
            </Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger id="edit-position" className="h-9 text-xs">
                <SelectValue placeholder="Pilih Jabatan" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos.position_id} value={pos.position_id} className="text-xs">
                    {pos.name} - {pos.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone" className="text-xs font-semibold">
              Nomor Telepon
            </Label>
            <Input
              id="edit-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0812-3456-7890"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email" className="text-xs font-semibold">
              Alamat Email {!editTarget && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="worker@zanxa.studio"
              className="h-9 text-xs"
              required={!editTarget}
            />
          </div>

          {!editTarget && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-password" className="text-xs font-semibold">
                Password Awal <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-password"
                type="password"
                value={password}
                onChange={(e) => setPassword?.(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="h-9 text-xs"
                required
                minLength={6}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-joined" className="text-xs font-semibold">
              Tanggal Bergabung
            </Label>
            <Input
              id="edit-joined"
              type="date"
              value={joinedDate}
              onChange={(e) => setJoinedDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-status" className="text-xs font-semibold">
              Status Akun
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="edit-status" className="h-9 text-xs">
                <SelectValue placeholder="Pilih Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active" className="text-xs">Aktif</SelectItem>
                <SelectItem value="inactive" className="text-xs">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="edit-notes" className="text-xs font-semibold">
              Catatan / Keterangan
            </Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Spesialisasi, kualifikasi, atau catatan teknis..."
              className="h-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Bottom Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckIcon className="size-4" />
                <span>{editTarget ? "Simpan Perubahan" : "Tambah Worker"}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
