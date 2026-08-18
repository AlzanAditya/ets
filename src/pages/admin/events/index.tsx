import * as React from "react";
import {
  Calendar,
  Clock,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Building2,
  Wrench,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Play,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { productEventsService, type ProductEventData, type EventType } from "@/services/product-events.service";
import { clientsService } from "@/services/clients.service";
import type { ClientRow } from "@/types/database";
import { CreateMultiProductEventDialog } from "@/components/events/create-multi-product-event-dialog";
import { CompleteInstallationWarrantyDialog } from "@/components/warranties/complete-installation-warranty-dialog";
import { toast } from "sonner";

export default function EventsPage() {
  const [loading, setLoading] = React.useState(true);
  const [events, setEvents] = React.useState<ProductEventData[]>([]);
  const [clients, setClients] = React.useState<ClientRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [selectedClient, setSelectedClient] = React.useState<string>("all");

  // Dialog States
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [selectedEventForDetail, setSelectedEventForDetail] = React.useState<ProductEventData | null>(null);
  const [completeWarrantyModal, setCompleteWarrantyModal] = React.useState<{
    open: boolean;
    productId: string;
    eventId: string;
    productCount: number;
  }>({
    open: false,
    productId: "",
    eventId: "",
    productCount: 1,
  });

  const fetchEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await productEventsService.getAllEvents({
        event_type: selectedType === "all" ? undefined : (selectedType as EventType),
        status: selectedStatus === "all" ? undefined : selectedStatus,
        client_id: selectedClient === "all" ? undefined : selectedClient,
        search: search.trim() || undefined,
        limit: 200,
      });
      setEvents(res.events);
    } catch (err) {
      console.error("Failed to load events:", err);
      toast.error("Gagal memuat data event");
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedStatus, selectedClient, search]);

  // Load clients once
  React.useEffect(() => {
    clientsService
      .getClients()
      .then((cls) => setClients(cls))
      .catch((err) => console.warn("Failed to load clients:", err));
  }, []);

  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Metrics summary
  const summary = React.useMemo(() => {
    let total = events.length;
    let scheduled = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;

    events.forEach((e) => {
      if (e.status === "scheduled") scheduled++;
      else if (e.status === "active" || e.status === "in_progress") inProgress++;
      else if (e.status === "completed") completed++;
      else if (e.status === "cancelled") cancelled++;
    });

    return { total, scheduled, inProgress, completed, cancelled };
  }, [events]);

  const handleStartScheduledEvent = async (eventId: string, title: string) => {
    try {
      await productEventsService.startScheduledEvent(eventId);
      toast.success(`Event ${title} resmi dimulai. Status produk telah diperbarui.`);
      fetchEvents();
    } catch (err: any) {
      console.error("Failed to start event:", err);
      toast.error(err.message || "Gagal memulai event");
    }
  };

  const handleCancelEvent = async (eventId: string, title: string) => {
    if (!confirm(`Batalkan event "${title}"?`)) return;
    try {
      await productEventsService.cancelEvent(eventId, "Dibatalkan oleh Admin");
      toast.success(`Event ${title} berhasil dibatalkan.`);
      fetchEvents();
    } catch (err: any) {
      console.error("Failed to cancel event:", err);
      toast.error(err.message || "Gagal membatalkan event");
    }
  };

  const handleOpenCompleteDialog = (event: ProductEventData) => {
    if (event.event_type === "installation") {
      setCompleteWarrantyModal({
        open: true,
        productId: event.product_id || (event.products && event.products[0]?.product_id) || "",
        eventId: event.event_id,
        productCount: event.products?.length || 1,
      });
    } else {
      // Maintenance complete
      productEventsService
        .completeEvent(event.product_id || "", event.event_id)
        .then(() => {
          toast.success(`Event maintenance "${event.title}" selesai.`);
          fetchEvents();
        })
        .catch((err) => toast.error(err.message || "Gagal menyelesaikan event"));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
            <Layers className="size-4" />
            <span>Product Lifecycle & Operations</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mt-1">
            Manajemen Events Produk
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Jadwal pengerjaan instalasi dan maintenance unit stabilizer untuk berbagai klien.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEvents}
            disabled={loading}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 rounded-xl text-xs gap-1.5 shadow-sm"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>Tambah Event (Multi-Produk)</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Event</span>
            <Layers className="size-4 text-zinc-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-zinc-100">{summary.total}</div>
          <span className="text-[11px] text-zinc-500 mt-1">Semua jenis operasional</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-blue-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-400">Terjadwal</span>
            <Clock className="size-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-blue-300">{summary.scheduled}</div>
          <span className="text-[11px] text-blue-500/80 mt-1">Belum dimulai</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">Sedang Berjalan</span>
            <Play className="size-4 text-amber-400 fill-amber-400/20" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-300">{summary.inProgress}</div>
          <span className="text-[11px] text-amber-500/80 mt-1">Dalam pengerjaan aktif</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-emerald-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">Selesai</span>
            <CheckCircle2 className="size-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-300">{summary.completed}</div>
          <span className="text-[11px] text-emerald-500/80 mt-1">Garansi aktif / terupdate</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Event, No Seri, Klien..."
              className="pl-9 h-9 text-xs bg-zinc-900 border-zinc-800 rounded-xl text-zinc-100"
            />
          </div>

          {/* Client Filter */}
          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 size-4 text-zinc-500 pointer-events-none" />
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full pl-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 pr-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Perusahaan / Client</option>
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>
                  {c.client_name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 size-4 text-zinc-500 pointer-events-none" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full pl-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 pr-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Jenis Event</option>
              <option value="installation">Instalasi</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 size-4 text-zinc-500 pointer-events-none" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full pl-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 pr-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Status Pelaksanaan</option>
              <option value="scheduled">Terjadwal (Scheduled)</option>
              <option value="active">Sedang Berjalan (Active)</option>
              <option value="completed">Selesai (Completed)</option>
              <option value="cancelled">Dibatalkan (Cancelled)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Data Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Jenis Event</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Jadwal / Waktu</th>
                <th className="py-3.5 px-4">Perusahaan / Klien</th>
                <th className="py-3.5 px-4">Produk Terkait</th>
                <th className="py-3.5 px-4">Progress Step</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-amber-400" />
                      <span>Memuat data event...</span>
                    </div>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="size-6 text-zinc-600" />
                      <p>Tidak ada event yang sesuai dengan filter.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setSelectedType("all");
                          setSelectedStatus("all");
                          setSelectedClient("all");
                        }}
                        className="text-xs border-zinc-800 mt-1"
                      >
                        Reset Filter
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                events.map((evt) => {
                  const isInst = evt.event_type === "installation";
                  const completedSteps = evt.steps.filter((s) => s.status === "completed").length;
                  const totalSteps = evt.steps.length;
                  const productCount = evt.products?.length || 1;

                  return (
                    <tr key={evt.event_id} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Jenis Event */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2 rounded-xl border ${
                              isInst
                                ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            }`}
                          >
                            {isInst ? <PackageCheck className="size-4" /> : <Wrench className="size-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-200">{evt.title}</div>
                            <span className="text-[10px] uppercase font-mono text-zinc-500">
                              {evt.event_type}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status Event */}
                      <td className="py-3.5 px-4">
                        {evt.status === "scheduled" ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] uppercase font-mono px-2 py-0.5 gap-1"
                          >
                            <Clock className="size-3" />
                            <span>Terjadwal</span>
                          </Badge>
                        ) : evt.status === "active" || evt.status === "in_progress" ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] uppercase font-mono px-2 py-0.5 gap-1"
                          >
                            <Play className="size-3 fill-amber-400" />
                            <span>Sedang Berjalan</span>
                          </Badge>
                        ) : evt.status === "completed" ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] uppercase font-mono px-2 py-0.5 gap-1"
                          >
                            <CheckCircle2 className="size-3" />
                            <span>Selesai</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] uppercase font-mono px-2 py-0.5 gap-1"
                          >
                            <XCircle className="size-3" />
                            <span>Dibatalkan</span>
                          </Badge>
                        )}
                      </td>

                      {/* Jadwal / Tanggal */}
                      <td className="py-3.5 px-4 font-mono text-zinc-300">
                        {evt.scheduled_date ? (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Calendar className="size-3.5 text-zinc-500" />
                            <span>
                              {new Date(evt.scheduled_date).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ) : evt.started_at ? (
                          <div className="text-[11px] text-zinc-400">
                            Mulai:{" "}
                            {new Date(evt.started_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        {evt.client?.client_name ? (
                          <div>
                            <div className="font-medium text-zinc-200">
                              {evt.client.client_name}
                            </div>
                            {evt.client.client_code && (
                              <span className="text-[10px] font-mono text-zinc-500">
                                {evt.client.client_code}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic">Internal / Umum</span>
                        )}
                      </td>

                      {/* Produk Terkait */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className="bg-zinc-800 text-zinc-200 font-mono text-xs px-2 py-0.5 rounded-lg border border-zinc-700"
                          >
                            {productCount} Produk
                          </Badge>
                          {evt.products && evt.products.length > 0 && (
                            <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[150px]">
                              {evt.products.map((p) => p.serial_number || p.product_code).join(", ")}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Progress Step */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5 min-w-[120px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400 font-mono">
                              {completedSteps}/{totalSteps} Step
                            </span>
                            <span className="text-zinc-500 font-mono">
                              {totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                completedSteps === totalSteps
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                              }`}
                              style={{
                                width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Aksi Menu */}
                      <td className="py-3.5 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-zinc-900 border-zinc-800 text-zinc-100 min-w-[190px]"
                          >
                            <DropdownMenuLabel className="text-xs text-zinc-400 font-mono">
                              Tindakan Event
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-zinc-800" />

                            <DropdownMenuItem
                              onClick={() => setSelectedEventForDetail(evt)}
                              className="text-xs cursor-pointer gap-2 hover:bg-zinc-800"
                            >
                              <Eye className="size-3.5 text-zinc-400" />
                              <span>Lihat Detail & Steps</span>
                            </DropdownMenuItem>

                            {evt.status === "scheduled" && (
                              <DropdownMenuItem
                                onClick={() => handleStartScheduledEvent(evt.event_id, evt.title)}
                                className="text-xs cursor-pointer gap-2 text-amber-400 hover:bg-amber-500/10 focus:bg-amber-500/10 font-medium"
                              >
                                <Play className="size-3.5 fill-amber-400" />
                                <span>Mulai Event Sekarang</span>
                              </DropdownMenuItem>
                            )}

                            {(evt.status === "active" || evt.status === "in_progress") && (
                              <DropdownMenuItem
                                onClick={() => handleOpenCompleteDialog(evt)}
                                className="text-xs cursor-pointer gap-2 text-emerald-400 hover:bg-emerald-500/10 focus:bg-emerald-500/10 font-medium"
                              >
                                <CheckCircle2 className="size-3.5" />
                                <span>Selesaikan Event</span>
                              </DropdownMenuItem>
                            )}

                            {evt.status !== "completed" && evt.status !== "cancelled" && (
                              <>
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                <DropdownMenuItem
                                  onClick={() => handleCancelEvent(evt.event_id, evt.title)}
                                  className="text-xs cursor-pointer gap-2 text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/10"
                                >
                                  <XCircle className="size-3.5" />
                                  <span>Batalkan Event</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Multi Product Event Modal */}
      <CreateMultiProductEventDialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onEventCreated={() => {
          fetchEvents();
        }}
      />

      {/* Complete Installation Warranty Dialog */}
      <CompleteInstallationWarrantyDialog
        open={completeWarrantyModal.open}
        onOpenChange={(open) =>
          setCompleteWarrantyModal((prev) => ({ ...prev, open }))
        }
        productId={completeWarrantyModal.productId}
        eventId={completeWarrantyModal.eventId}
        productCount={completeWarrantyModal.productCount}
        onCompleted={() => {
          fetchEvents();
        }}
      />

      {/* Detail & Step Progress Modal */}
      {selectedEventForDetail && (
        <Dialog
          open={Boolean(selectedEventForDetail)}
          onOpenChange={(open) => {
            if (!open) setSelectedEventForDetail(null);
          }}
        >
          <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-4 border-b border-zinc-800/80 bg-zinc-900/40">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-wider">
                <Layers className="size-4" />
                <span>Detail Event Operasional</span>
              </div>
              <DialogTitle className="text-lg font-bold text-zinc-100 flex items-center justify-between">
                <span>{selectedEventForDetail.title}</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-mono px-2 py-0.5 ${
                    selectedEventForDetail.status === "completed"
                      ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                      : selectedEventForDetail.status === "scheduled"
                      ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
                      : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                  }`}
                >
                  {selectedEventForDetail.status}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                {selectedEventForDetail.client?.client_name
                  ? `Klien: ${selectedEventForDetail.client.client_name}`
                  : "Internal Event"}{" "}
                • Dibuat:{" "}
                {new Date(selectedEventForDetail.created_at).toLocaleDateString("id-ID")}
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Linked Products Section */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-300">
                  Produk Terhubung ({selectedEventForDetail.products?.length || 1})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedEventForDetail.products || []).map((p: any) => (
                    <div
                      key={p.product_id}
                      className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-mono font-bold text-zinc-200">
                          {p.serial_number || p.product_code || "Unit Stabilizer"}
                        </div>
                        <div className="text-[11px] text-zinc-400">{p.product_name}</div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-mono px-1.5 py-0 border-zinc-700 text-zinc-300"
                      >
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress Steps List */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-zinc-300">Tahapan Pengerjaan (Steps)</div>
                <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                  {selectedEventForDetail.steps.map((st, idx) => (
                    <div
                      key={st.step_id || idx}
                      className="p-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                            st.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : st.status === "active"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-200">{st.title}</div>
                          {st.completed_at && (
                            <div className="text-[10px] text-zinc-500 font-mono">
                              Selesai:{" "}
                              {new Date(st.completed_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 ${
                          st.status === "completed"
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                            : st.status === "active"
                            ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                            : "border-zinc-700 text-zinc-500 bg-zinc-800/40"
                        }`}
                      >
                        {st.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedEventForDetail.notes && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-zinc-400">Catatan Pengerjaan:</div>
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 whitespace-pre-wrap">
                    {selectedEventForDetail.notes}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
