import { useLocation } from "react-router-dom"
import { NetworkStatusBadge } from "../status/NetworkStatusBadge"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

function getGreetingPrefix(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "Selamat Pagi"
  if (hour >= 12 && hour < 15) return "Selamat Siang"
  if (hour >= 15 && hour < 18) return "Selamat Sore"
  return "Selamat Malam"
}

export interface WorkerHeaderProps {
  className?: string
  title?: string
  subtitle?: string
  type?: "beranda" | "jadwal" | "tugas" | "riwayat" | "profil" | "custom"
  workerName?: string
}

export function WorkerHeader({
  className,
  title: customTitle,
  type,
  workerName,
}: WorkerHeaderProps) {
  const location = useLocation()
  const { profile, user } = useAuth()

  const path = location.pathname.toLowerCase()
  const isBeranda =
    type === "beranda" ||
    path === "/worker" ||
    path === "/worker/" ||
    path === "/worker/home" ||
    path === "/worker/beranda" ||
    (!path.includes("/jadwal") &&
      !path.includes("/schedule") &&
      !path.includes("/tugas") &&
      !path.includes("/task") &&
      !path.includes("/pekerjaan") &&
      !path.includes("/riwayat") &&
      !path.includes("/history") &&
      !path.includes("/histori") &&
      !path.includes("/profil") &&
      !path.includes("/profile"))

  // Determine user name
  const fullName =
    workerName ||
    profile?.full_name ||
    profile?.name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0] : null) ||
    "Dika"

  const firstName = fullName.split(" ")[0]

  // Time-based greeting prefix
  const greetingPrefix = getGreetingPrefix()

  // Dynamic header title based on type or path
  let pageTitle = customTitle

  if (!pageTitle) {
    if (type === "jadwal" || path.includes("/jadwal") || path.includes("/schedule")) {
      pageTitle = "Jadwal Saya"
    } else if (
      type === "tugas" ||
      path.includes("/tugas") ||
      path.includes("/pekerjaan") ||
      path.includes("/task")
    ) {
      pageTitle = "Tugas Saya"
    } else if (
      type === "riwayat" ||
      path.includes("/riwayat") ||
      path.includes("/histori") ||
      path.includes("/history")
    ) {
      pageTitle = "Riwayat Pekerjaan"
    } else if (type === "profil" || path.includes("/profil") || path.includes("/profile")) {
      pageTitle = "Profil Saya"
    } else {
      // Default to Beranda
      pageTitle = `${greetingPrefix}, ${firstName} 👋`
    }
  }

  return (
    <header
      className={cn(
        "w-full bg-transparent px-4 py-3.5 transition-colors",
        className
      )}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-white truncate">
            {pageTitle}
          </h1>
        </div>

        {/* Network status badge shown ONLY on Beranda */}
        {isBeranda && (
          <div className="shrink-0 flex items-center">
            <NetworkStatusBadge />
          </div>
        )}
      </div>
    </header>
  )
}
