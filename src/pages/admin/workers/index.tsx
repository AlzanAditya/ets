import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { getWorkerProfilePhotoUrl, uploadWorkerProfilePhoto, deleteWorkerProfilePhoto } from "@/lib/image-service";
import { optimizeAvatarImage } from "@/lib/image-optimizer";
import { queryKeys } from "@/lib/query-keys";
import {
  UsersIcon,
  HardHatIcon,
  BriefcaseIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react";

import { MetricCards } from "@/components/metric-cards";
import { PageContent } from "@/components/page-content";
import { DataTable, type DataTableTab } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useWorkers,
  useWorkerPositions,
  useCreateWorkerMutation,
  useUpdateWorkerMutation,
} from "@/hooks/use-workers";
import { useTableSchema } from "@/hooks/use-table-schema";
import { mergeDynamicColumns } from "@/lib/dynamic-columns";
import { WorkerViewMode } from "./components/worker-view-mode";
import { WorkerEditMode } from "./components/worker-edit-mode";
import { WorkerDeleteDialog } from "./components/worker-delete-dialog";
import type { WorkerWithDetails } from "@/services/workers.service";
import type { MetricCardItem } from "@/types/metrics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EXCLUDED_WORKER_COLUMNS = [
  "worker_id",
  "position_id",
  "profile_photo_path",
  "profile_image_path",
  "password_hash",
  "created_at",
  "updated_at",
  "deleted_at",
];

export default function WorkersPage() {
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [selectedPosition, setSelectedPosition] = React.useState<string>("all");

  const { data: workers = [], refetch } = useWorkers("", selectedPosition);
  const { data: positions = [] } = useWorkerPositions();
  const { columns: schemaColumns } = useTableSchema("workers");

  const createMutation = useCreateWorkerMutation();
  const updateMutation = useUpdateWorkerMutation();

  // Dialogs & edit state
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [workerToDelete, setWorkerToDelete] = React.useState<WorkerWithDetails | null>(null);

  // Define pinned columns for DataTable
  const PINNED_COLUMNS = React.useMemo<ColumnDef<WorkerWithDetails & { id: string }>[]>(
    () => [
      {
        id: "profile",
        header: "Profil",
        cell: ({ row }) => {
          const worker = row.original;
          const targetId = worker.worker_id || worker.id || "";
          const photoUrl = getWorkerProfilePhotoUrl(
            targetId,
            worker.profile_photo_path || worker.profile_image_path
          );
          const initials = worker.full_name
            ? worker.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()
            : "WK";

          return (
            <Avatar className="size-9 border border-border/60 shrink-0">
              {photoUrl ? <AvatarImage src={photoUrl} alt={worker.full_name} /> : null}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          );
        },
      },
      {
        accessorKey: "full_name",
        header: "Nama Lengkap",
        cell: ({ row }) => {
          const worker = row.original;
          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <span>{worker.full_name}</span>
                {worker.nickname && (
                  <span className="text-[11px] text-muted-foreground font-normal">
                    ("{worker.nickname}")
                  </span>
                )}
              </div>
              {worker.joined_date && (
                <div className="text-[10px] text-muted-foreground">
                  Joined: {worker.joined_date}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "operational_status",
        header: "Status Operasional",
        cell: ({ row }) => {
          const status = row.original.operational_status;
          return (
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-semibold gap-1 px-2 py-0.5",
                status === "In Installation"
                  ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                  : status === "In Maintenance"
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/30"
              )}
            >
              {status === "In Installation" ? (
                <HardHatIcon className="size-3" />
              ) : status === "In Maintenance" ? (
                <WrenchIcon className="size-3" />
              ) : null}
              {status || "Inactive"}
            </Badge>
          );
        },
      },
      {
        id: "position",
        accessorKey: "position_id",
        header: "Jabatan",
        cell: ({ row }) => {
          const posName = row.original.position?.name || "Teknisi";
          return (
            <Badge variant="outline" className="font-normal text-[11px]">
              {posName}
            </Badge>
          );
        },
      },
      {
        accessorKey: "worker_code",
        header: "Kode Worker",
        meta: { defaultHidden: true },
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground font-medium">
            {row.original.worker_code || "—"}
          </span>
        ),
      },
      {
        accessorKey: "phone_number",
        header: "Nomor Telepon",
        meta: { defaultHidden: true },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.phone_number || "—"}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        meta: { defaultHidden: true },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.email || "—"}
          </span>
        ),
      },
      {
        accessorKey: "joined_date",
        header: "Tanggal Bergabung",
        meta: { defaultHidden: true },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.joined_date || "—"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status Akun",
        meta: { defaultHidden: true },
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-[11px] font-normal capitalize">
            {row.original.status || "active"}
          </Badge>
        ),
      },
      {
        accessorKey: "total_assignments",
        header: "Total Assignment",
        meta: { defaultHidden: true },
        cell: ({ row }) => (
          <span className="px-2 py-0.5 rounded-full bg-muted font-mono text-xs font-semibold">
            {row.original.total_assignments || 0} task
          </span>
        ),
      },
      {
        accessorKey: "notes",
        header: "Catatan",
        meta: { defaultHidden: true },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground truncate max-w-[180px] block">
            {row.original.notes || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: true,
        cell: ({ row }) => {
          const worker = row.original;
          const targetId = worker.worker_id || worker.id || "";
          return (
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
          );
        },
      },
    ],
    [navigate]
  );

  const columns = React.useMemo(() => {
    return mergeDynamicColumns(
      PINNED_COLUMNS,
      schemaColumns,
      EXCLUDED_WORKER_COLUMNS
    );
  }, [PINNED_COLUMNS, schemaColumns]);

  const tabs: DataTableTab[] = React.useMemo(() => {
    return [
      {
        value: "all",
        label: "Semua",
        badge: workers.length,
      },
      ...positions.map((pos) => {
        const count = workers.filter((w) => w.position_id === pos.position_id).length;
        return {
          value: pos.position_id,
          label: pos.name,
          badge: count,
        };
      }),
    ];
  }, [positions, workers]);

  const mappedWorkers = React.useMemo(() => {
    return workers.map((w) => ({
      ...w,
      id: w.worker_id || w.id || w.worker_code,
    }));
  }, [workers]);

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
  const [password, setPassword] = React.useState("");
  const [positionId, setPositionId] = React.useState("");
  const [joinedDate, setJoinedDate] = React.useState("");
  const [status, setStatus] = React.useState("active");
  const [notes, setNotes] = React.useState("");

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [isAvatarRemoved, setIsAvatarRemoved] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Helper to generate unique worker code
  const generateUniqueWorkerCode = React.useCallback((existingWorkers: WorkerWithDetails[]) => {
    let attempts = 0;
    let code = "";
    do {
      const num = Math.floor(1000 + Math.random() * 9000);
      code = `WRK-${num}`;
      attempts++;
    } while (existingWorkers.some((w) => w.worker_code === code) && attempts < 100);
    return code;
  }, []);

  // Sync form fields when currentWorker or isEditMode changes
  React.useEffect(() => {
    if (isAddPage) {
      setFullName("");
      setNickname("");
      setPassword("");
      setWorkerCode(generateUniqueWorkerCode(workers));
      setPhone("");
      setEmail("");
      setPositionId(positions[0]?.position_id || "11111111-1111-4111-8111-111111111102");
      setJoinedDate(new Date().toISOString().split("T")[0]);
      setStatus("active");
      setNotes("");
      setAvatarUrl(null);
      setPendingFile(null);
      setIsAvatarRemoved(false);
    } else if (currentWorker) {
      setFullName(currentWorker.full_name || currentWorker.name || "");
      setNickname(currentWorker.nickname || "");
      setPassword("");
      setWorkerCode(currentWorker.worker_code || "");
      setPhone(currentWorker.phone_number || "");
      setEmail(currentWorker.email || "");
      setPositionId(currentWorker.position_id || (positions[0]?.position_id ?? "11111111-1111-4111-8111-111111111102"));
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
  }, [currentWorker, isAddPage, positions, workers, generateUniqueWorkerCode]);

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

    if (isAddPage || !currentWorker) {
      if (!email.trim()) {
        toast.error("Alamat email wajib diisi");
        return;
      }
      if (!password || password.length < 6) {
        toast.error("Password awal wajib diisi (minimal 6 karakter)");
        return;
      }

      // Check duplicate email in existing workers list
      const emailExists = workers.some(
        (w) => w.email && w.email.trim().toLowerCase() === email.trim().toLowerCase()
      );
      if (emailExists) {
        toast.error("Email sudah digunakan.");
        return;
      }

      // Check duplicate worker_code in existing workers list
      const codeExists = workers.some(
        (w) => w.worker_code && w.worker_code.trim().toLowerCase() === workerCode.trim().toLowerCase()
      );
      if (codeExists) {
        toast.error("Kode Worker sudah digunakan.");
        return;
      }
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
        password: password,
        position_id: positionId || positions[0]?.position_id || "11111111-1111-4111-8111-111111111102",
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

        queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
        navigate("/workers", { replace: true });
      }
    } catch (err: any) {
      console.error("Gagal menyimpan data worker:", err);
      // Toast notification is already handled by mutation onError callback
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute metrics for list view
  const totalWorkers = workers.length;
  const activeOnSite = workers.filter((w) => w.operational_status !== "Inactive").length;
  const totalAssignments = workers.reduce((acc, w) => acc + (w.total_assignments || 0), 0);

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
          password={password}
          setPassword={setPassword}
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

      <DataTable
        persistenceKey="workers"
        onRefresh={refetch}
        addButtonLabel="Tambah Worker"
        columns={columns}
        data={mappedWorkers}
        activeTab={selectedPosition}
        onTabChange={setSelectedPosition}
        tabs={tabs}
        onAddClick={() => navigate("/workers/add")}
        onRowClick={(row) => {
          const targetId = row.worker_id || row.id || "";
          navigate(`/workers/${encodeURIComponent(targetId)}`);
        }}
        searchPlaceholder="Cari nama, ID, email..."
      />

      {/* Delete Dialog */}
      <WorkerDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        worker={workerToDelete}
      />
    </PageContent>
  );
}
