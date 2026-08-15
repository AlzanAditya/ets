import * as React from "react"
import { useNavigate } from "react-router-dom"
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
} from "lucide-react"
import { toast } from "sonner"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { InteractiveAreaChartConfig } from "@/types/charts"
import type { MetricCardItem } from "@/types/metrics"

export interface ReportShortcutItem {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
}

const REPORT_DOC_TYPES: ReportShortcutItem[] = [
  { id: "survey", title: "Survey", icon: Search },
  { id: "final_survey", title: "Final Survey", icon: SearchCheck },
  { id: "material", title: "Material", icon: Package },
  { id: "pengiriman", title: "Pengiriman unit", icon: Truck },
  { id: "instalasi", title: "Instalasi", icon: Wrench },
  { id: "dokumentasi", title: "Dokumentasi", icon: Camera },
  { id: "berita_acara", title: "Berita Acara", icon: KeyRound },
  { id: "serah_terima", title: "Serah Terima", icon: Handshake },
  { id: "training", title: "Training", icon: ClipboardList },
]

const metrics = [
  {
    label: "Total Jenis Laporan",
    value: "9 Jenis",
    delta: "Aktif",
    trend: "up",
    summary: "Standardisasi dokumen operasional",
    description: "Format laporan siap pakai untuk lapangan",
    icon: FileChartColumnIcon,
  },
] satisfies MetricCardItem[]

const chart = {
  title: "Aktivitas Pembuatan Laporan",
  description: "Tren pembuatan dokumen & laporan operasional",
  compactDescription: "Tren laporan",
  data: [
    { date: "2024-01-01", desktop: 12, mobile: 5 },
    { date: "2024-01-02", desktop: 18, mobile: 9 },
    { date: "2024-01-03", desktop: 15, mobile: 11 },
    { date: "2024-01-04", desktop: 24, mobile: 14 },
  ],
  chartConfig: {
    desktop: { label: "Selesai", color: "var(--primary)" },
    mobile: { label: "Draft", color: "var(--primary)" },
  },
  ranges: [
    { value: "7d", label: "7 Hari", days: 7 },
    { value: "30d", label: "30 Hari", days: 30 },
  ],
  defaultRange: "7d",
  mobileRange: "7d",
  referenceDate: "2024-01-04",
} satisfies InteractiveAreaChartConfig

export default function ReportsPage() {
  const navigate = useNavigate()

  const handleCreateDocument = (doc: ReportShortcutItem) => {
    if (doc.id === "survey") {
      navigate("/reports/survey")
      return
    }
    if (doc.id === "final_survey") {
      navigate("/reports/final-survey")
      return
    }
    if (doc.id === "berita_acara") {
      navigate("/reports/berita-acara")
      return
    }
    toast.info(`Form pembuatan dokumen '${doc.title}' akan segera tersedia.`, {
      description: `Shortcut untuk modul ${doc.title} siap diintegrasikan dengan sistem backend.`,
    })
  }

  return (
    <PageContent
      description="Manajemen & pembuat dokumen laporan operasional proyek."
      eyebrow="Dokumen & Analitik"
      title="Reports"
    >
      <MetricCards items={metrics} />

      {/* Shortcuts Pembuatan Dokumen Laporan */}
      <div className="px-4 lg:px-6">
        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-3 sm:gap-4">
              {REPORT_DOC_TYPES.map((doc) => {
                const IconComponent = doc.icon
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
                        <IconComponent className="h-6 w-6 sm:h-8 sm:w-8 text-foreground group-hover:text-primary transition-colors stroke-[2]" />
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
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-[2fr_1fr] lg:px-6">
        <ChartAreaInteractive config={chart} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perpustakaan Laporan</CardTitle>
            <CardDescription className="text-xs">
              Kategori & arsip dokumen yang telah dibuat
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <div className="p-2 rounded-md bg-muted/40 border border-border/40 text-xs">
              • Ringkasan Laporan Bulanan
            </div>
            <div className="p-2 rounded-md bg-muted/40 border border-border/40 text-xs">
              • Antrean Ekspor PDF & Excel
            </div>
            <div className="p-2 rounded-md bg-muted/40 border border-border/40 text-xs">
              • Arsip Dokumen Terverifikasi
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  )
}

