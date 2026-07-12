import * as React from "react"
import { SettingsIcon, UserIcon, PaletteIcon, ShieldIcon, SaveIcon, MonitorIcon, MoonIcon, SunIcon, ZapIcon, ZapOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { PageContent } from "@/components/page-content"
import { useAuth } from "@/contexts/auth-context"
import { useAnimation } from "@/contexts/animation-context"
import { useTheme } from "next-themes"
import { supabase } from "@/lib/supabase"
import { useTableDensity } from "@/contexts/table-density-context"
import { DENSITY_CONFIG, ALL_DENSITIES } from "@/lib/table-density"
import { AlignJustify, List, Rows3 } from "lucide-react"

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  warehouse: "Warehouse",
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30",
  admin: "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30",
  warehouse: "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30",
}

export default function SettingsPage() {
  const { admin, user } = useAuth()
  const { animationsEnabled, toggleAnimations } = useAnimation()
  const { theme, setTheme } = useTheme()
  const { density, setDensity } = useTableDensity()

  const [fullName, setFullName] = React.useState(admin?.full_name ?? "")
  const [saving, setSaving] = React.useState(false)
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null)

  // Sync form when admin loads
  React.useEffect(() => {
    if (admin?.full_name) setFullName(admin.full_name)
  }, [admin?.full_name])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setSaving(true)
    setSaveMsg(null)

    const { error } = await supabase
      .from("admins")
      .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
      .eq("id", user.id)

    setSaving(false)
    setSaveMsg(error ? `Gagal menyimpan: ${error.message}` : "Profil berhasil disimpan.")
    setTimeout(() => setSaveMsg(null), 3000)
  }

  const role = admin?.role ?? "admin"

  return (
    <PageContent
      description="Kelola preferensi aplikasi, profil akun, dan konfigurasi workspace."
      eyebrow="Administration"
      title="Settings"
    >
      <div className="grid grid-cols-1 gap-6 px-4 lg:grid-cols-3 lg:px-6">

        {/* ── Profile ──────────────────────────────────────────────────── */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                <UserIcon className="size-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Profil</CardTitle>
                <CardDescription className="text-xs">Informasi akun administrator</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="settings-email" className="text-xs text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="settings-email"
                  value={user?.email ?? ""}
                  disabled
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="settings-fullname" className="text-xs">
                  Nama Lengkap
                </Label>
                <Input
                  id="settings-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  className="h-8 text-sm"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !fullName.trim()}
                className="h-8 gap-2"
              >
                <SaveIcon className="size-3.5" />
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
              {saveMsg && (
                <p className={`text-xs ${saveMsg.startsWith("Gagal") ? "text-destructive" : "text-emerald-400"}`}>
                  {saveMsg}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* ── Appearance ───────────────────────────────────────────────── */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                <PaletteIcon className="size-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Tampilan</CardTitle>
                <CardDescription className="text-xs">Tema dan preferensi visual</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            {/* Theme toggle */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Tema Warna</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["light", "dark", "system"] as const).map((t) => {
                  const icons = { light: SunIcon, dark: MoonIcon, system: MonitorIcon }
                  const Icon = icons[t]
                  const labels = { light: "Terang", dark: "Gelap", system: "Sistem" }
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs transition-colors ${theme === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-border/80 hover:bg-muted/50"
                        }`}
                    >
                      <Icon className="size-4" />
                      {labels[t]}
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Table Density */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Kerapatan Tabel (Density)</Label>
              <div className="grid grid-cols-3 gap-2">
                {ALL_DENSITIES.map((d) => {
                  const icons = { spacious: AlignJustify, normal: List, compact: Rows3 }
                  const Icon = icons[d]
                  const config = DENSITY_CONFIG[d]
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDensity(d)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs transition-colors ${density === d
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-border/80 hover:bg-muted/50"
                        }`}
                    >
                      <Icon className="size-4" />
                      <span className="font-medium">{config.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Animation toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ${animationsEnabled ? "bg-emerald-500/15" : "bg-muted"}`}>
                  {animationsEnabled
                    ? <ZapIcon className="size-3.5 text-emerald-400" />
                    : <ZapOffIcon className="size-3.5 text-muted-foreground" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium">Animasi UI</p>
                  <p className="text-xs text-muted-foreground">
                    {animationsEnabled ? "Aktif — transisi & efek hover berjalan" : "Nonaktif — semua animasi dimatikan"}
                  </p>
                </div>
              </div>
              <Switch
                id="settings-animation-toggle"
                checked={animationsEnabled}
                onCheckedChange={toggleAnimations}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Access ───────────────────────────────────────────────────── */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                <ShieldIcon className="size-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Hak Akses</CardTitle>
                <CardDescription className="text-xs">Peran dan izin akun Anda</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Peran saat ini</span>
                <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${ROLE_COLORS[role] ?? ROLE_COLORS.admin}`}>
                  {ROLE_LABELS[role] ?? role}
                </span>
              </div>
            </div>

            <Separator />

            <div className="grid gap-2.5 text-xs">
              {[
                { label: "Lihat Dashboard & Produk", allowed: true },
                { label: "Buat & Submit Transaksi", allowed: ["admin", "super_admin"].includes(role) },
                { label: "Setujui / Tolak Transaksi", allowed: ["admin", "super_admin"].includes(role) },
                { label: "Kelola Cabang & Klien", allowed: role === "super_admin" },
                { label: "Hapus Data (Soft Delete)", allowed: role === "super_admin" },
                { label: "Akses Semua Pengaturan", allowed: role === "super_admin" },
              ].map(({ label, allowed }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <Badge
                    variant="outline"
                    className={`text-[0.6rem] ${allowed ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground"}`}
                  >
                    {allowed ? "Diizinkan" : "Dibatasi"}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="mt-1 rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
              <SettingsIcon className="mb-1 inline size-3 mr-1" />
              Untuk mengubah hak akses, hubungi administrator sistem.
            </div>
          </CardContent>
        </Card>

      </div>
    </PageContent>
  )
}
