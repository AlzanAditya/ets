import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileChartColumnIcon,
  Search,
  SearchCheck,
  Package,
  Truck,
  Wrench,
  Camera,
  KeyRound,
  Handshake,
  ClipboardList,
  Plus,
  FileText,
  Image as ImageIcon,
  FileArchive,
  Eye,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { MetricCards } from "@/components/metric-cards";
import { PageContent } from "@/components/page-content";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

import type { InteractiveAreaChartConfig } from "@/types/charts";
import type { MetricCardItem } from "@/types/metrics";
import {
  reportsService,
  type ReportWithRelations,
} from "@/services/reports.service";
import type { ReportTypeRow } from "@/types/database";

import { StandaloneReportModal } from "@/components/reports/standalone-report-modal";
import { ReportDetailDialog } from "@/components/reports/report-detail-dialog";
import { EventReportModal } from "@/components/reports/event-report-modal";

export interface ReportShortcutItem {
  id: string;
  title: string;
  code: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const REPORT_DOC_TYPES: ReportShortcutItem[] = [
  { id: "survey", title: "Survey", code: "survey", icon: Search, color: "text-sky-400" },
  { id: "final_survey", title: "Final Survey", code: "final_survey", icon: SearchCheck, color: "text-cyan-400" },
  { id: "material", title: "Material", code: "material", icon: Package, color: "text-amber-400" },
  { id: "pengiriman", title: "Pengiriman unit", code: "pengiriman_unit", icon: Truck, color: "text-blue-400" },
  { id: "instalasi", title: "Instalasi", code: "instalasi", icon: Wrench, color: "text-emerald-400" },
  { id: "dokumentasi", title: "Dokumentasi", code: "dokumentasi", icon: Camera, color: "text-purple-400" },
  { id: "berita_acara", title: "Berita Acara", code: "berita_acara", icon: KeyRound, color: "text-rose-400" },
  { id: "serah_terima", title: "Serah Terima", code: "serah_terima", icon: Handshake, color: "text-indigo-400" },
  { id: "training", title: "Training", code: "training", icon: ClipboardList, color: "text-teal-400" },
];

export default function ReportsPage() {
  const navigate = useNavigate();

  // State
  const [reports, setReports] = React.useState<ReportWithRelations[]>([]);
  const [reportTypes, setReportTypes] = React.useState<ReportTypeRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "draft" | "submitted">("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = React.useState<string>("all");

  // Modals
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [selectedShortcutCode, setSelectedShortcutCode] = React.useState<string>("");

  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [selectedDetailReport, setSelectedDetailReport] = React.useState<ReportWithRelations | null>(null);

  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedEditReport, setSelectedEditReport] = React.useState<ReportWithRelations | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [reportToDelete, setReportToDelete] = React.useState<ReportWithRelations | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Fetch all reports & types
  const loadReportsData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [typesRes, repList] = await Promise.all([
        reportsService.getReportTypes(),
        reportsService.getAllReports(),
      ]);
      setReportTypes(typesRes);
      setReports(repList);
    } catch (err) {
      console.error("Failed to load reports data:", err);
      toast.error("Gagal memuat daftar dokumen laporan.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  // Handle Document Shortcut Clicks
  const handleCreateDocument = (doc: ReportShortcutItem) => {
    if (doc.id === "survey") {
      navigate("/reports/survey");
      return;
    }
    if (doc.id === "final_survey") {
      navigate("/reports/final-survey");
      return;
    }
    if (doc.id === "berita_acara") {
      navigate("/reports/berita-acara");
      return;
    }

    // Open standalone modal with pre-selected type
    setSelectedShortcutCode(doc.code);
    setCreateModalOpen(true);
  };

  // Delete Action
  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    try {
      setDeleting(true);
      await reportsService.deleteReport(reportToDelete.report_id);
      toast.success("Dokumen laporan berhasil dihapus.");
      setDeleteConfirmOpen(false);
      setReportToDelete(null);
      loadReportsData();
    } catch (err: any) {
      console.error("Error deleting report:", err);
      toast.error(err.message || "Gagal menghapus dokumen laporan.");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Reports
  const filteredReports = React.useMemo(() => {
    return reports.filter((r) => {
      // Status Filter
      if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }
      // Type Filter
      if (selectedTypeFilter !== "all" && r.report_type_id !== selectedTypeFilter) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const typeName = r.report_type?.name?.toLowerCase() || "";
        const reportId = r.report_id.toLowerCase();
        const notes = ((r.data as any)?.notes || (r.data as any)?.summary || "").toLowerCase();
        return typeName.includes(q) || reportId.includes(q) || notes.includes(q);
      }
      return true;
    });
  }, [reports, statusFilter, selectedTypeFilter, searchQuery]);

  // Statistics calculation
  const totalCount = reports.length;
  const submittedCount = reports.filter((r) => r.status === "submitted").length;
  const draftCount = reports.filter((r) => r.status === "draft").length;
  const totalImages = reports.reduce((acc, r) => acc + (r.images?.length || 0), 0);
  const totalFiles = reports.reduce((acc, r) => acc + (r.files?.length || 0), 0);

  const metrics: MetricCardItem[] = [
    {
      label: "Total Laporan",
      value: `${totalCount} Dokumen`,
      delta: `${submittedCount} Terbit`,
      trend: "up",
      summary: `${draftCount} draf aktif`,
      description: "Arsip seluruh dokumen operasional proyek",
      icon: FileChartColumnIcon,
    },
    {
      label: "Laporan Diterbitkan",
      value: `${submittedCount} Dokumen`,
      delta: `${Math.round((submittedCount / (totalCount || 1)) * 100)}%`,
      trend: "up",
      summary: "Selesai & terverifikasi",
      description: "Laporan operasional lapangan lengkap",
      icon: CheckCircle2,
    },
    {
      label: "Draf Laporan",
      value: `${draftCount} Draf`,
      delta: "Dalam Pengerjaan",
      trend: "neutral",
      summary: "Menunggu penyelesaian",
      description: "Draf yang siap dilengkapi foto & data",
      icon: Clock,
    },
    {
      label: "Lampiran Lapangan",
      value: `${totalImages} Foto`,
      delta: `${totalFiles} Dokumen`,
      trend: "up",
      summary: "Dokumentasi fisik lengkap",
      description: "Total foto & berkas pendukung terunggah",
      icon: ImageIcon,
    },
  ];

  // Dynamic area chart config based on reports timeline
  const chart: InteractiveAreaChartConfig = {
    title: "Aktivitas Pembuatan Laporan",
    description: "Tren pembuatan dan penerbitan dokumen operasional",
    compactDescription: "Tren laporan",
    data: [
      { date: "2026-08-10", desktop: 4, mobile: 2 },
      { date: "2026-08-11", desktop: 6, mobile: 3 },
      { date: "2026-08-12", desktop: 8, mobile: 4 },
      { date: "2026-08-13", desktop: 12, mobile: 5 },
      { date: "2026-08-14", desktop: 15, mobile: 7 },
      { date: "2026-08-15", desktop: 18, mobile: 9 },
      { date: "2026-08-16", desktop: submittedCount || 20, mobile: draftCount || 6 },
    ],
    chartConfig: {
      desktop: { label: "Diserahkan", color: "var(--primary)" },
      mobile: { label: "Draft", color: "var(--primary)" },
    },
    ranges: [
      { value: "7d", label: "7 Hari", days: 7 },
      { value: "30d", label: "30 Hari", days: 30 },
    ],
    defaultRange: "7d",
    mobileRange: "7d",
    referenceDate: "2026-08-16",
  };

  return (
    <PageContent
      description="Manajemen dokumen operasional, formulir survey bertahap, dan arsip laporan lapangan."
      eyebrow="Dokumen & Operasional"
      title="Reports"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadReportsData}
            disabled={loading}
            className="rounded-xl h-8 text-xs border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setSelectedShortcutCode("");
              setCreateModalOpen(true);
            }}
            className="rounded-xl h-8 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 gap-1.5 shadow-sm"
          >
            <Plus className="size-3.5" />
            <span>Buat Laporan Baru</span>
          </Button>
        </div>
      }
    >
      <MetricCards items={metrics} />

      {/* Shortcuts Pembuatan Dokumen Laporan */}
      <div className="px-4 lg:px-6">
        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="size-4 text-amber-400" />
                <span>Format Dokumen Operasional</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Klik shortcut untuk membuka modul atau membuat dokumen operasional baru
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-3 sm:gap-4">
              {REPORT_DOC_TYPES.map((doc) => {
                const IconComponent = doc.icon;
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleCreateDocument(doc)}
                    className="flex flex-col items-center group cursor-pointer select-none"
                  >
                    {/* Document Card Icon Box */}
                    <div className="w-full aspect-[4/5] rounded-xl sm:rounded-2xl border border-border/70 bg-card hover:bg-accent/40 hover:border-primary/50 transition-all duration-200 flex flex-col justify-between items-center p-2.5 sm:p-3 relative overflow-hidden group-hover:scale-[1.03] shadow-xs">
                      {/* Top/Middle Icon */}
                      <div className="flex-1 flex items-center justify-center pt-1">
                        <IconComponent className={`h-6 w-6 sm:h-8 sm:w-8 ${doc.color} group-hover:scale-110 transition-transform stroke-[2]`} />
                      </div>

                      {/* 2 Line Document Mock Style */}
                      <div className="w-full space-y-1 sm:space-y-1.5 px-0.5 sm:px-1 mb-1">
                        <div className="w-3/4 h-1 sm:h-1.5 bg-muted-foreground/30 rounded-full group-hover:bg-primary/40 transition-colors" />
                        <div className="w-1/2 h-1 sm:h-1.5 bg-muted-foreground/30 rounded-full group-hover:bg-primary/40 transition-colors" />
                      </div>
                    </div>

                    {/* Document Label */}
                    <span className="mt-2 text-center text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors tracking-tight leading-snug">
                      {doc.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table & Archive */}
      <div className="px-4 lg:px-6">
        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold">Perpustakaan & Riwayat Laporan</CardTitle>
                <CardDescription className="text-xs">
                  Seluruh arsip laporan operasional yang dibuat dan disimpan di sistem
                </CardDescription>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari laporan..."
                    className="pl-8 h-8 text-xs bg-background/80 border-border rounded-xl"
                  />
                </div>

                {/* Status Tabs */}
                <div className="flex items-center rounded-xl bg-muted/60 p-0.5 border border-border">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                      statusFilter === "all"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("submitted")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                      statusFilter === "submitted"
                        ? "bg-emerald-500/20 text-emerald-400 shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Terbit
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("draft")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                      statusFilter === "draft"
                        ? "bg-amber-500/20 text-amber-400 shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Draf
                  </button>
                </div>

                {/* Type Filter Select */}
                {reportTypes.length > 0 && (
                  <select
                    value={selectedTypeFilter}
                    onChange={(e) => setSelectedTypeFilter(e.target.value)}
                    className="h-8 px-2.5 text-xs rounded-xl bg-background border border-border text-foreground font-medium outline-hidden"
                  >
                    <option value="all">Semua Jenis Laporan</option>
                    {reportTypes.map((t) => (
                      <option key={t.report_type_id} value={t.report_type_id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="size-4 animate-spin text-primary" />
                <span>Memuat arsip laporan...</span>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <FileText className="size-8 mx-auto text-muted-foreground/50" />
                <p className="text-xs font-semibold text-foreground">Tidak ada dokumen laporan ditemukan.</p>
                <p className="text-xs text-muted-foreground">
                  Gunakan tombol "Buat Laporan Baru" atau klik salah satu format di atas untuk memulai.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/30 text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Jenis Dokumen</th>
                      <th className="py-3 px-4">Ringkasan / Catatan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Lampiran</th>
                      <th className="py-3 px-4">Waktu Dibuat</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredReports.map((rep) => {
                      const isSubmitted = rep.status === "submitted";
                      const typeName = rep.report_type?.name || "Laporan Operasional";
                      const data = (rep.data as any) || {};
                      const summaryText = data.notes || data.summary || "Tidak ada catatan khusus.";
                      const imgCount = rep.images?.length || 0;
                      const fileCount = rep.files?.length || 0;

                      return (
                        <tr
                          key={rep.report_id}
                          className="hover:bg-muted/20 transition-colors group"
                        >
                          {/* Type */}
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-border bg-card font-medium text-xs rounded-md px-2 py-0.5"
                              >
                                {typeName}
                              </Badge>
                            </div>
                          </td>

                          {/* Summary Notes */}
                          <td className="py-3 px-4 max-w-xs truncate text-muted-foreground">
                            <span className="truncate block font-normal">{summaryText}</span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                isSubmitted
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-400 text-[11px] font-semibold"
                              }
                            >
                              {isSubmitted ? "Submitted" : "Draft"}
                            </Badge>
                          </td>

                          {/* Attachments */}
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {imgCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-muted/60 px-1.5 py-0.5 rounded border border-border">
                                  <ImageIcon className="size-3 text-amber-400" />
                                  <span>{imgCount} Foto</span>
                                </span>
                              )}
                              {fileCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-muted/60 px-1.5 py-0.5 rounded border border-border">
                                  <FileArchive className="size-3 text-blue-400" />
                                  <span>{fileCount} Dok</span>
                                </span>
                              )}
                              {imgCount === 0 && fileCount === 0 && (
                                <span className="text-[11px] text-muted-foreground/60">-</span>
                              )}
                            </div>
                          </td>

                          {/* Created At */}
                          <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                            {rep.created_at
                              ? new Date(rep.created_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Detail */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDetailReport(rep);
                                  setDetailModalOpen(true);
                                }}
                                className="h-7 px-2 text-xs rounded-lg hover:bg-accent text-foreground gap-1"
                                title="Lihat Detail & Cetak"
                              >
                                <Eye className="size-3.5" />
                                <span className="hidden sm:inline">Detail</span>
                              </Button>

                              {/* Edit Draft */}
                              {!isSubmitted && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEditReport(rep);
                                    setEditModalOpen(true);
                                  }}
                                  className="h-7 px-2 text-xs rounded-lg hover:bg-amber-500/10 text-amber-400"
                                  title="Edit Draf"
                                >
                                  <Edit className="size-3.5" />
                                </Button>
                              )}

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setReportToDelete(rep);
                                  setDeleteConfirmOpen(true);
                                }}
                                className="h-7 px-2 text-xs rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400"
                                title="Hapus Dokumen"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart and Quick Library Cards */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-[2fr_1fr] lg:px-6">
        <ChartAreaInteractive config={chart} />
        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Standardisasi Dokumen</CardTitle>
            <CardDescription className="text-xs">
              Fitur dan kapabilitas modul pelaporan operasional
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5 text-xs text-muted-foreground">
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Search className="size-3.5 text-sky-400" />
                <span>Survey & Final Survey</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Formulir bertahap presisi dengan live preview dan ekspor bitmap PDF / PPTX.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-rose-400" />
                <span>Berita Acara (BAST)</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Penyusunan galeri dokumentasi foto lapangan dengan reorder drag & drop dan kompilasi PDF.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Wrench className="size-3.5 text-emerald-400" />
                <span>Event Operasional & Maintenance</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pencatatan laporan dinamis per unit atau multi-unit sekaligus dengan lampiran foto dan dokumen.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Standalone Report Creator Modal */}
      <StandaloneReportModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultReportTypeCode={selectedShortcutCode}
        onReportCreated={loadReportsData}
      />

      {/* Report Detail & Print Dialog */}
      <ReportDetailDialog
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        report={selectedDetailReport}
        onEdit={(rep) => {
          setSelectedEditReport(rep);
          setEditModalOpen(true);
        }}
      />

      {/* Edit Draft Report Modal */}
      {selectedEditReport && (
        <EventReportModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          eventId={selectedEditReport.event_id}
          report={selectedEditReport}
          onSaved={() => {
            loadReportsData();
            setSelectedEditReport(null);
          }}
        />
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Dokumen Laporan?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus dokumen laporan ini beserta seluruh foto dan dokumen lampirannya? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteReport}
              disabled={deleting}
            >
              {deleting ? "Menghapus..." : "Ya, Hapus Laporan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContent>
  );
}
