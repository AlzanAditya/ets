import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getWorkerProfilePhotoUrl, uploadWorkerProfilePhoto, deleteWorkerProfilePhoto } from "@/lib/image-service";
import { optimizeAvatarImage } from "@/lib/image-optimizer";
import { queryKeys } from "@/lib/query-keys";
import {
  UserCheckIcon,
  UsersIcon,
  HardHatIcon,
  BriefcaseIcon,
  SearchIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  FilterIcon,
  WrenchIcon,
} from "lucide-react";

import { MetricCards } from "@/components/metric-cards";
import { PageContent } from "@/components/page-content";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useWorkers,
  useWorkerPositions,
  useCreateWorkerMutation,
  useUpdateWorkerMutation,
} from "@/hooks/use-workers";
import { WorkerViewMode } from "./components/worker-view-mode";
import { WorkerEditMode } from "./components/worker-edit-mode";
import { WorkerDeleteDialog } from "./components/worker-delete-dialog";
import type { WorkerWithDetails } from "@/services/workers.service";
import type { MetricCardItem } from "@/types/metrics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function WorkersPage() {
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedPosition, setSelectedPosition] = React.useState<string>("all");

  const { data: workers = [], isLoading } = useWorkers(searchTerm, selectedPosition);
  const { data: positions = [] } = useWorkerPositions();

  const createMutation = useCreateWorkerMutation();
  const updateMutation = useUpdateWorkerMutation();

  // Dialogs & edit state
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [workerToDelete, setWorkerToDelete] = React.useState<WorkerWithDetails | null>(null);

  // Determine current active worker from route param
  const isAddPage = location.pathname.endsWith("/add");
  const workerParam = params.id;

  const currentWorker = React.useMemo(() => {
    if (!workerParam || isAddPage) return null;
    const decoded = decodeURIComponent(workerParam);
    return (
      workers.find(
        (w) =>
          w.worker_id === decoded ||
          w.id === decoded ||
          w.worker_code === decoded ||
          w.full_name?.toLowerCase() === decoded.toLowerCase()
      ) || null
    );
  }, [workerParam, isAddPage, workers]);

  const isEditMode = React.useMemo(() => {
    if (isAddPage) return true;
    return location.search.includes("edit=true") || location.search.includes("?edit");
  }, [isAddPage, location.search]);

  // Edit form state
  const [fullName, setFullName] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [workerCode, setWorkerCode] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [positionId, setPositionId] = React.useState("");
  const [joinedDate, setJoinedDate] = React.useState("");
  const [status, setStatus] = React.useState("active");
  const [notes, setNotes] = React.useState("");

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [isAvatarRemoved, setIsAvatarRemoved] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sync form fields when currentWorker or isEditMode changes
  React.useEffect(() => {
    if (isAddPage) {
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
      setPendingFile(null);
      setIsAvatarRemoved(false);
    } else if (currentWorker) {
      setFullName(currentWorker.full_name || currentWorker.name || "");
      setNickname(currentWorker.nickname || "");
      setWorkerCode(currentWorker.worker_code || "");
      setPhone(currentWorker.phone_number || "");
      setEmail(currentWorker.email || "");
      setPositionId(currentWorker.position_id || (positions[0]?.position_id ?? "pos-2"));
      setJoinedDate(currentWorker.joined_date || new Date().toISOString().split("T")[0]);
      setStatus(currentWorker.status || "active");
      setNotes(currentWorker.notes || "");
      setAvatarUrl(
        getWorkerProfilePhotoUrl(
          currentWorker.worker_id || currentWorker.id,
          currentWorker.profile_photo_path || currentWorker.profile_image_path
        )
      );
      setPendingFile(null);
      setIsAvatarRemoved(false);
    }
  }, [currentWorker, isAddPage, positions]);

  // Handle local avatar selection & 300x300 WebP optimization
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG, PNG, WebP)");
      return;
    }

    try {
      const { file: optimizedFile, previewUrl } = await optimizeAvatarImage(file, 300);
      setPendingFile(optimizedFile);
      setAvatarUrl(previewUrl);
      setIsAvatarRemoved(false);
      toast.success("Foto profil dikonversi ke 300x300 WebP");

      // If in view mode, directly upload and update database
      if (!isEditMode && currentWorker) {
        const targetId = currentWorker.worker_id || currentWorker.id || "";
        const publicUrl = await uploadWorkerProfilePhoto(targetId, optimizedFile);
        if (publicUrl) {
          await updateMutation.mutateAsync({
            workerId: targetId,
            data: { profile_image_path: publicUrl },
          });
          queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
          toast.success("Foto profil worker berhasil diperbarui");
        }
      }
    } catch (err: any) {
      console.error("Gagal memproses gambar:", err);
      toast.error("Gagal mengompres foto profil worker");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarUrl(null);
    setPendingFile(null);
    setIsAvatarRemoved(true);

    if (!isEditMode && currentWorker) {
      const targetId = currentWorker.worker_id || currentWorker.id || "";
      await deleteWorkerProfilePhoto(targetId);
      await updateMutation.mutateAsync({
        workerId: targetId,
        data: { profile_image_path: null },
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
      toast.info("Foto profil worker berhasil dihapus");
    } else {
      toast.info("Foto profil akan dihapus saat disimpan");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }

    try {
      setIsSubmitting(true);
      let uploadedPhotoPath: string | null = avatarUrl;

      const payload = {
        worker_code: workerCode.trim(),
        full_name: fullName.trim(),
        nickname: nickname.trim() || null,
        phone_number: phone.trim() || null,
        email: email.trim() || null,
        position_id: positionId || positions[0]?.position_id || "pos-2",
        joined_date: joinedDate || null,
        status: status,
        notes: notes.trim() || null,
      };

      if (currentWorker && !isAddPage) {
        const targetId = currentWorker.worker_id || currentWorker.id || "";
        if (pendingFile) {
          const publicUrl = await uploadWorkerProfilePhoto(targetId, pendingFile);
          if (publicUrl) {
            uploadedPhotoPath = publicUrl;
          }
        } else if (isAvatarRemoved) {
          await deleteWorkerProfilePhoto(targetId);
          uploadedPhotoPath = null;
        }

        await updateMutation.mutateAsync({
          workerId: targetId,
          data: {
            ...payload,
            profile_image_path: uploadedPhotoPath,
          },
        });
        toast.success("Data worker berhasil diperbarui");
        navigate(`/workers/${encodeURIComponent(targetId)}`, { replace: true });
      } else {
        const newWorker = await createMutation.mutateAsync(payload);
        const newId = newWorker.worker_id || newWorker.id || "";

        if (pendingFile && newId) {
          const publicUrl = await uploadWorkerProfilePhoto(newId, pendingFile);
          if (publicUrl) {
            await updateMutation.mutateAsync({
              workerId: newId,
              data: { profile_image_path: publicUrl },
            });
          }
        }

        toast.success("Worker baru berhasil ditambahkan");
        navigate(`/workers/${encodeURIComponent(newId)}`, { replace: true });
      }
    } catch (err: any) {
      console.error("Error saving worker:", err);
      toast.error(err.message || "Gagal menyimpan data worker");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute metrics for list view
  const totalWorkers = workers.length;
  const activeOnSite = workers.filter((w) => w.operational_status !== "Inactive").length;
  const totalAssignments = workers.reduce((acc, w) => acc + w.total_assignments, 0);

  const metrics: MetricCardItem[] = [
    {
      label: "Total Workers",
      value: String(totalWorkers),
      delta: "+ active",
      trend: "up",
      summary: "Pekerja terdaftar",
      description: "Teknisi & personel operasional",
      icon: UsersIcon,
    },
    {
      label: "Active On-site",
      value: String(activeOnSite),
      delta: totalWorkers > 0 ? `${Math.round((activeOnSite / totalWorkers) * 100)}%` : "0%",
      trend: "up",
      summary: "Sedang di lapangan",
      description: "Menangani instalasi & pemeliharaan",
      icon: HardHatIcon,
    },
    {
      label: "Total Assignments",
      value: String(totalAssignments),
      delta: "Task Step",
      trend: "up",
      summary: "Total penugasan step",
      description: "Tercatat di seluruh proyek",
      icon: BriefcaseIcon,
    },
  ];

  // 1. EDIT MODE
  if (isEditMode) {
    return (
      <PageContent
        description="Edit profil pekerja, kualifikasi teknis, dan informasi kontak."
        eyebrow="Personnel"
        title={currentWorker ? `Edit Worker: ${currentWorker.full_name}` : "Tambah Worker Baru"}
      >
        <WorkerEditMode
          editTarget={currentWorker}
          fullName={fullName}
          setFullName={setFullName}
          nickname={nickname}
          setNickname={setNickname}
          workerCode={workerCode}
          setWorkerCode={setWorkerCode}
          phone={phone}
          setPhone={setPhone}
          email={email}
          setEmail={setEmail}
          positionId={positionId}
          setPositionId={setPositionId}
          joinedDate={joinedDate}
          setJoinedDate={setJoinedDate}
          status={status}
          setStatus={setStatus}
          notes={notes}
          setNotes={setNotes}
          avatarUrl={avatarUrl}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
          handleRemoveAvatar={handleRemoveAvatar}
          onSubmit={handleSubmit}
          onCancel={() => {
            if (currentWorker) {
              const targetId = currentWorker.worker_id || currentWorker.id || "";
              navigate(`/workers/${encodeURIComponent(targetId)}`);
            } else {
              navigate("/workers");
            }
          }}
          isSubmitting={isSubmitting}
        />
      </PageContent>
    );
  }

  // 2. VIEW MODE
  if (currentWorker) {
    return (
      <PageContent
        description="Detail profil teknisi, status operasional, dan riwayat penugasan proyek."
        eyebrow="Personnel"
        title={currentWorker.full_name}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <WorkerViewMode
          worker={currentWorker}
          avatarUrl={avatarUrl}
          fileInputRef={fileInputRef}
          onAvatarChange={handleFileChange}
          onAvatarRemove={handleRemoveAvatar}
          onEdit={() => {
            const targetId = currentWorker.worker_id || currentWorker.id || "";
            navigate(`/workers/${encodeURIComponent(targetId)}?edit=true`);
          }}
          onBack={() => navigate("/workers")}
        />
      </PageContent>
    );
  }

  // 3. LIST MODE
  return (
    <PageContent
      description="Manajemen data teknisi, tim lapangan, dan penugasan personel operasional."
      eyebrow="Personnel"
      title="Workers"
    >
      <MetricCards items={metrics} />

      <div className="px-4 lg:px-6 space-y-4">
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <UserCheckIcon className="size-5 text-emerald-500" />
                Daftar Pekerja &amp; Teknisi Lapangan
              </CardTitle>
              <CardDescription className="text-xs">
                Kelola profil personel, status operasional, dan riwayat penugasan step proyek.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Jabatan */}
              <div className="w-40">
                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                  <SelectTrigger className="h-9 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <FilterIcon className="size-3 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Semua Jabatan" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Semua Jabatan
                    </SelectItem>
                    {positions.map((pos) => (
                      <SelectItem key={pos.position_id} value={pos.position_id} className="text-xs">
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, ID, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Add Button */}
              <Button
                size="sm"
                onClick={() => navigate("/workers/add")}
                className="h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <PlusIcon className="size-4" />
                Tambah Worker
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="px-4 py-3">Pekerja</th>
                      <th className="px-4 py-3">Kode Worker</th>
                      <th className="px-4 py-3">Jabatan</th>
                      <th className="px-4 py-3">Kontak</th>
                      <th className="px-4 py-3">Status Operasional</th>
                      <th className="px-4 py-3 text-center">Total Assignment</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">
                          Memuat data worker...
                        </td>
                      </tr>
                    ) : workers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground italic">
                          Tidak ada data worker ditemukan.
                        </td>
                      </tr>
                    ) : (
                      workers.map((worker) => {
                        const targetId = worker.worker_id || worker.id || "";
                        const initials = worker.full_name
                          ? worker.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()
                          : "WK";

                        return (
                          <tr
                            key={targetId}
                            onClick={() => navigate(`/workers/${encodeURIComponent(targetId)}`)}
                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-9 border border-border/60">
                                  {getWorkerProfilePhotoUrl(targetId, worker.profile_photo_path || worker.profile_image_path) ? (
                                    <AvatarImage src={getWorkerProfilePhotoUrl(targetId, worker.profile_photo_path || worker.profile_image_path) || undefined} alt={worker.full_name} />
                                  ) : null}
                                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                                    <span>{worker.full_name}</span>
                                    {worker.nickname && (
                                      <span className="text-[11px] text-muted-foreground font-normal">
                                        ("{worker.nickname}")
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    Joined: {worker.joined_date || "-"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground font-medium">
                              {worker.worker_code}
                            </td>

                            <td className="px-4 py-3 text-xs">
                              <Badge variant="outline" className="font-normal text-[11px]">
                                {worker.position?.name || "Teknisi"}
                              </Badge>
                            </td>

                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              <div>{worker.phone_number || "-"}</div>
                              <div className="text-[11px] opacity-70">{worker.email || "-"}</div>
                            </td>

                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[11px] font-semibold gap-1 px-2 py-0.5",
                                  worker.operational_status === "In Installation"
                                    ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                                    : worker.operational_status === "In Maintenance"
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                    : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                                )}
                              >
                                {worker.operational_status === "In Installation" ? (
                                  <HardHatIcon className="size-3" />
                                ) : worker.operational_status === "In Maintenance" ? (
                                  <WrenchIcon className="size-3" />
                                ) : null}
                                {worker.operational_status}
                              </Badge>
                            </td>

                            <td className="px-4 py-3 text-center text-xs font-semibold">
                              <span className="px-2 py-0.5 rounded-full bg-muted font-mono">
                                {worker.total_assignments} task
                              </span>
                            </td>

                            <td
                              className="px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/workers/${encodeURIComponent(targetId)}`)}
                                  className="size-8 text-muted-foreground hover:text-foreground"
                                  title="Lihat Detail & History"
                                >
                                  <EyeIcon className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/workers/${encodeURIComponent(targetId)}?edit=true`)}
                                  className="size-8 text-muted-foreground hover:text-foreground"
                                  title="Edit Worker"
                                >
                                  <PencilIcon className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setWorkerToDelete(worker);
                                    setIsDeleteOpen(true);
                                  }}
                                  className="size-8 text-muted-foreground hover:text-destructive"
                                  title="Hapus Worker"
                                >
                                  <Trash2Icon className="size-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <WorkerDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        worker={workerToDelete}
      />
    </PageContent>
  );
}
