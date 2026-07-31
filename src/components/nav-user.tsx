import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { EllipsisVerticalIcon, SettingsIcon, LogOutIcon, ShieldIcon } from "lucide-react"
import type { UserProfile } from "@/types/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useNavigate } from "react-router-dom"

const placeholderUser = {
  name: "Preview User",
  email: "preview@example.test",
  fallback: "PU",
} satisfies UserProfile

/**
 * Purpose: render the sidebar user account menu.
 * Responsibilities: show user identity, avatar fallback, and account actions.
 * Wired to useAuth for real logout + admin profile display.
 */
export function NavUser({
  user = placeholderUser,
}: {
  user?: UserProfile
}) {
  const { isMobile } = useSidebar()
  const { profile, role, user: authUser, signOut } = useAuth()
  const navigate = useNavigate()

  // Prefer live profile or Supabase auth user metadata/email when available
  const displayName =
    profile?.full_name ||
    profile?.name ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    (authUser?.email ? authUser.email.split("@")[0] : null) ||
    user.name
  const displayEmail = profile?.email || authUser?.email || user.email
  const fallback = displayName ? displayName.slice(0, 2).toUpperCase() : "US"

  async function handleSignOut() {
    await signOut()
    navigate("/login", { replace: true })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar || undefined} alt={displayName} />
                <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {displayEmail}
                </span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar || undefined} alt={displayName} />
                  <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {displayEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {role && role !== "guest" && (
                <DropdownMenuItem disabled className="gap-2 opacity-60">
                  <ShieldIcon className="size-4" />
                  {role === "super_admin"
                    ? "Super Admin"
                    : role === "admin"
                    ? "Admin"
                    : role === "worker"
                    ? "Worker"
                    : role}
                </DropdownMenuItem>
              )}
              {role !== "worker" && (
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => navigate("/settings")}
                >
                  <SettingsIcon className="size-4" />
                  Settings
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              id="nav-user-logout"
              className="gap-2 text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOutIcon className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
