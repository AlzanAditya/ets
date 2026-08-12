import { LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useWorkerData } from "@/hooks/use-worker-data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export default function WorkerProfile() {
  const { logout } = useAuth()
  const { workerProfile, loading } = useWorkerData()

  const name = workerProfile.name || "Dika Pratama"
  const position = workerProfile.position || "Teknisi Instalasi"
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const infoItems = [
    { label: "Worker Code", value: workerProfile.workerCode, isMono: true },
    { label: "Email", value: workerProfile.email },
    { label: "No. HP", value: workerProfile.phone, isMono: true },
    { label: "Posisi", value: workerProfile.position },
    { label: "Tanggal Bergabung", value: workerProfile.joinDate },
    { label: "Role", value: "Worker" },
  ]

  return (
    <div className="space-y-6 animate-fade-in pt-2">
      {/* Top Header Avatar & Name (No card container, blends with page) */}
      <div className="flex flex-col items-center text-center space-y-3 py-2">
        <Avatar className="size-24 border-2 border-primary/40 shadow-lg ring-2 ring-primary/20">
          <AvatarImage src={workerProfile.avatarUrl} alt={name} className="object-cover" />
          <AvatarFallback className="font-extrabold text-2xl bg-primary/10 text-accent-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-0.5">
          <h2 className="font-bold text-xl text-foreground tracking-tight">
            {name}
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            {position}
          </p>
        </div>
      </div>

      {/* Info List (No card wrapper, plain list with subtle border lines) */}
      <div className="divide-y divide-border/60 border-y border-border/60 my-2">
        {infoItems.map((item, idx) => (
          <div
            key={item.label || idx}
            className="py-3 px-1 flex items-center justify-between gap-3 text-xs"
          >
            <span className="text-muted-foreground font-medium shrink-0">
              {item.label}
            </span>
            <span
              className={`font-semibold text-foreground tracking-tight text-right truncate ${
                item.isMono ? "font-mono" : ""
              }`}
            >
              {loading ? "..." : item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <div className="pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => logout()}
          className="w-full h-11 rounded-2xl font-bold gap-2 shadow-xs transition-all active:scale-[0.99] border-rose-500/30 text-rose-400 bg-transparent hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut className="size-4" />
          <span>Keluar</span>
        </Button>
      </div>
    </div>
  )
}
