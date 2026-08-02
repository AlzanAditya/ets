import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PencilIcon,
  PhoneIcon,
  MailIcon,
  BriefcaseIcon,
  ClockIcon,
  LayersIcon,
  ArrowLeftIcon,
  HardHatIcon,
  CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  EntityProfileBanner,
  EntityExpandableSection,
  CompactDetailRow,
  type EntityBadge,
  type EntityDetailItem,
  type HeaderAction,
} from "@/components/entity-profile-banner";
import { useWorkerHistory } from "@/hooks/use-workers";
import { getWorkerProfilePhotoUrl } from "@/lib/image-service";
import type { WorkerWithDetails } from "@/services/workers.service";
import { productsService } from "@/services/products.service";
import { clientsService } from "@/services/clients.service";
import { WorkerEventCard } from "@/components/worker-event-card";
import { cn } from "@/lib/utils";

interface WorkerViewModeProps {
  worker: WorkerWithDetails;
  avatarUrl?: string | null;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  onAvatarChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarRemove?: () => void;
  onEdit: () => void;
  onBack: () => void;
}

export function WorkerViewMode({
  worker,
  avatarUrl: propAvatarUrl,
  fileInputRef,
  onAvatarChange,
  onAvatarRemove,
  onEdit,
  onBack,
}: WorkerViewModeProps) {
  const { data: history = [], isLoading: isLoadingHistory } = useWorkerHistory(
    worker.worker_id || worker.id || null
  );

  const { data: products = [] } = useQuery({
    queryKey: ["products", "all-for-history"],
    queryFn: () => productsService.getProducts({ limit: 200 }).catch(() => []),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "all-for-history"],
    queryFn: () => clientsService.getClients().catch(() => []),
  });

  const resolvedAvatarUrl =
    propAvatarUrl !== undefined
      ? propAvatarUrl
      : getWorkerProfilePhotoUrl(
          worker.worker_id || worker.id,
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

  // Determine status color
  let statusColor: "blue" | "amber" | "gray" = "gray";
  if (worker.operational_status === "In Installation") {
    statusColor = "blue";
  } else if (worker.operational_status === "In Maintenance") {
    statusColor = "amber";
  }

  // Construct Badges
  const badges: EntityBadge[] = [
    {
      id: "operational-status",
      label: worker.operational_status || "Inactive",
      color: statusColor,
    },
    {
      id: "assignments-badge",
      icon: BriefcaseIcon,
      value: `${worker.total_assignments || 0} Event`,
      label: "Assignments",
      color: "blue",
    },
    {
      id: "steps-badge",
      icon: LayersIcon,
      value: `${worker.total_events || 0} Event`,
      color: "emerald",
    },
  ];

  // Construct Details
  const details: EntityDetailItem[] = [];
  if (worker.email) {
    details.push({
      id: "email",
      icon: MailIcon,
      label: "Email",
      value: worker.email,
      href: `mailto:${worker.email}`,
    });
  }
  if (worker.phone_number) {
    details.push({
      id: "phone",
      icon: PhoneIcon,
      label: "No. Telepon",
      value: worker.phone_number,
      href: `tel:${worker.phone_number}`,
    });
  }
  if (worker.joined_date) {
    details.push({
      id: "joined",
      icon: CalendarIcon,
      label: "Tanggal Bergabung",
      value: worker.joined_date,
    });
  }

  // Header actions
  const headerActions: HeaderAction[] = [
    {
      id: "edit-worker",
      label: "Edit",
      icon: PencilIcon,
      onClick: onEdit,
      hideTextOnMobile: true,
      variant: "default",
      className: "bg-emerald-600 text-white hover:bg-emerald-700 font-semibold",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 w-full space-y-6 pb-12">
      {/* ── Top Navigation Row ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
        >
          <ArrowLeftIcon className="size-4" />
          <span>Kembali ke Daftar Worker</span>
        </Button>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {headerActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant || "default"}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn("gap-1.5 text-xs rounded-xl", action.className)}
              >
                {ActionIcon && <ActionIcon className="size-3.5" />}
                <span>{action.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── Global Entity Profile Banner ── */}
      <EntityProfileBanner
        profile={{
          type: "image",
          avatarUrl: resolvedAvatarUrl || null,
          fallbackInitials: initials,
          overlay: fileInputRef
            ? {
                type: "pencil",
                title: "Ubah foto profil worker",
                fileInputRef,
                onFileChange: onAvatarChange,
                onRemoveClick: onAvatarRemove,
              }
            : undefined,
        }}
        title={
          worker.nickname
            ? `${worker.full_name} ("${worker.nickname}")`
            : worker.full_name
        }
        subtitle={
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground font-medium pt-0.5">
            <HardHatIcon className="size-3 sm:size-3.5 text-amber-500 shrink-0" />
            <span>{worker.position?.name || "Teknisi"}</span>
          </div>
        }
        meta={
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 rounded-md border border-border/80 bg-muted/30 font-mono text-[10px] sm:text-xs">
            <span className="text-muted-foreground font-medium">Kode Worker:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {worker.worker_code}
            </span>
          </div>
        }
        badges={badges}
        details={details}
        expandable={{
          isExpandable: true,
          defaultExpanded: false,
          expandTriggerLabel: "Tampilkan Detail Informasi Worker",
          collapseTriggerLabel: "Sembunyikan Detail Worker",
          content: (
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <CompactDetailRow label="ID Worker" value={worker.worker_id || worker.id} />
              <CompactDetailRow label="Kode Worker" value={worker.worker_code} />
              <CompactDetailRow label="Nama Lengkap" value={worker.full_name} />
              <CompactDetailRow label="Nama Panggilan" value={worker.nickname || "—"} />
              <CompactDetailRow label="Jabatan / Posisi" value={worker.position?.name || "Teknisi"} />
              <CompactDetailRow label="Status Operasional" value={worker.operational_status} />
              <CompactDetailRow label="Nomor Telepon" value={worker.phone_number || "—"} />
              <CompactDetailRow label="Alamat Email" value={worker.email || "—"} />
              <CompactDetailRow label="Tanggal Bergabung" value={worker.joined_date || "—"} />
              <CompactDetailRow label="Catatan Tambahan" value={worker.notes || "—"} isFullWidth />
            </div>
          ),
        }}
      />

      {/* ── Additional Section: Riwayat Penugasan (Assignment History) ── */}
      <EntityExpandableSection
        title="Riwayat Penugasan (Assignment History)"
        icon={ClockIcon}
        defaultExpanded={true}
        badge={
          <Badge variant="secondary" className="text-xs font-mono">
            {history.length} Event
          </Badge>
        }
      >
        <div className="pt-3">
          {isLoadingHistory ? (
            <div className="text-xs text-muted-foreground py-6 text-center animate-pulse">
              Memuat riwayat penugasan...
            </div>
          ) : history.length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center border border-dashed rounded-xl">
              Belum ada riwayat penugasan terikat pada worker ini.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, idx) => {
                const rawEventType = item.event_type || "installation";
                const isInstallation = rawEventType === "installation";
                const eventTypeLabel = isInstallation ? "Instalasi" : "Maintenance";

                let serialNumber = item.product_serial || "";
                let productName = item.product_name || "Unit Perangkat";
                let clientName = "";
                let clientId = "";

                if (serialNumber) {
                  const matchedProd = products.find(
                    (p: any) => p.serial_number === serialNumber
                  );
                  if (matchedProd) {
                    productName = matchedProd.product_name || productName;
                    if (matchedProd.client?.client_name) {
                      clientName = matchedProd.client.client_name;
                      clientId =
                        matchedProd.client.client_id ||
                        matchedProd.current_client_id ||
                        "";
                    } else if (matchedProd.current_client_id) {
                      const matchedClient = clients.find(
                        (c: any) => c.client_id === matchedProd.current_client_id
                      );
                      if (matchedClient) {
                        clientName = matchedClient.client_name;
                        clientId = matchedClient.client_id;
                      }
                    }
                  }
                }

                if (!clientName && clients.length > 0) {
                  clientName = clients[0].client_name;
                  clientId = clients[0].client_id;
                }

                const rawDate = item.assigned_at
                  ? new Date(item.assigned_at)
                  : new Date();

                const formattedDate = rawDate.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <WorkerEventCard
                    key={item.assignment_id || item.event_id || idx}
                    eventId={item.event_id || item.assignment_id}
                    eventTitle={item.event_title || `Project ${eventTypeLabel}`}
                    eventType={rawEventType}
                    eventTypeLabel={eventTypeLabel}
                    clientId={clientId}
                    clientName={clientName || "Klien Utama"}
                    productName={productName}
                    serialNumber={serialNumber}
                    date={formattedDate}
                  />
                );
              })}
            </div>
          )}
        </div>
      </EntityExpandableSection>
    </div>
  );
}
