import React from "react";
import { getWorkerProfilePhotoUrl } from "@/lib/image-service";
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
import { useWorkers, useWorkerPositions } from "@/hooks/use-workers";
import { WorkerFormDialog } from "./components/worker-form-dialog";
import { WorkerDetailDialog } from "./components/worker-detail-dialog";
import { WorkerDeleteDialog } from "./components/worker-delete-dialog";
import type { WorkerWithDetails } from "@/services/workers.service";
import type { MetricCardItem } from "@/types/metrics";
import { cn } from "@/lib/utils";

export default function WorkersPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedPosition, setSelectedPosition] = React.useState<string>("all");

  const { data: workers = [], isLoading } = useWorkers(searchTerm, selectedPosition);
  const { data: positions = [] } = useWorkerPositions();

  // Modals state
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [workerToEdit, setWorkerToEdit] = React.useState<WorkerWithDetails | null>(null);

  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [workerForDetail, setWorkerForDetail] = React.useState<WorkerWithDetails | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [workerToDelete, setWorkerToDelete] = React.useState<WorkerWithDetails | null>(null);

  // Compute metrics
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

  const handleAddWorker = () => {
    setWorkerToEdit(null);
    setIsFormOpen(true);
  };

  const handleEditWorker = (worker: WorkerWithDetails) => {
    setWorkerToEdit(worker);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (worker: WorkerWithDetails) => {
    setWorkerForDetail(worker);
    setIsDetailOpen(true);
  };

  const handleDeleteWorker = (worker: WorkerWithDetails) => {
    setWorkerToDelete(worker);
    setIsDeleteOpen(true);
  };

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
                Daftar Pekerja & Teknisi Lapangan
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
              <Button size="sm" onClick={handleAddWorker} className="h-9 gap-1.5 text-xs font-semibold">
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
                        const initials = worker.full_name
                          ? worker.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()
                          : "WK";

                        return (
                          <tr key={worker.worker_id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-9 border border-border/60">
                                  {getWorkerProfilePhotoUrl(worker.worker_id || worker.id, worker.profile_photo_path || worker.profile_image_path) ? (
                                    <AvatarImage src={getWorkerProfilePhotoUrl(worker.worker_id || worker.id, worker.profile_photo_path || worker.profile_image_path)} alt={worker.full_name} />
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

                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDetail(worker)}
                                  className="size-8 text-muted-foreground hover:text-foreground"
                                  title="Lihat Detail & History"
                                >
                                  <EyeIcon className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditWorker(worker)}
                                  className="size-8 text-muted-foreground hover:text-foreground"
                                  title="Edit Worker"
                                >
                                  <PencilIcon className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteWorker(worker)}
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

      {/* Form Dialog */}
      <WorkerFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        workerToEdit={workerToEdit}
      />

      {/* Detail Dialog */}
      <WorkerDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        worker={workerForDetail}
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
