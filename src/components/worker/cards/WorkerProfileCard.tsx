import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { WorkerProfileData } from "../data/mock-worker-data"
import { cn } from "@/lib/utils"

export interface WorkerProfileCardProps {
  profile: WorkerProfileData
  className?: string
}

export function WorkerProfileCard({ profile, className }: WorkerProfileCardProps) {
  const name = profile.name || "Dika Pratama"
  const position = profile.position || "Teknisi Instalasi"
  const avatarUrl = profile.avatarUrl || ""

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-xs flex flex-col items-center text-center space-y-3",
        className
      )}
    >
      <div className="relative">
        <Avatar className="size-24 border-2 border-primary/30 shadow-md ring-2 ring-primary/20">
          <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
          <AvatarFallback className="font-extrabold text-2xl bg-primary/10 text-accent-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="space-y-1">
        <h2 className="font-extrabold text-lg text-foreground tracking-tight">
          {name}
        </h2>
        <p className="text-xs text-muted-foreground font-medium">
          {position}
        </p>
      </div>
    </div>
  )
}
