import { useAuth } from "@/contexts/auth-context";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsIcon, LogOutIcon, ShieldIcon } from "lucide-react";
import type { UserProfile } from "@/types/navigation";

const placeholderUser = {
  name: "Preview User",
  email: "preview@example.test",
  fallback: "PU",
} satisfies UserProfile;

export function HeaderUser({
  user = placeholderUser,
}: {
  user?: UserProfile;
}) {
  const { profile, role, user: authUser, signOut } = useAuth();
  const navigate = useNavigate();

  // Prefer live profile (admin or worker) or Supabase auth user metadata/email when available
  const displayName =
    profile?.full_name ||
    profile?.name ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    (authUser?.email ? authUser.email.split("@")[0] : null) ||
    user.name;
  const displayEmail = profile?.email || authUser?.email || user.email;
  const fallback = displayName ? displayName.slice(0, 2).toUpperCase() : "US";

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none flex items-center gap-2 hover:opacity-85 transition-opacity">
        <Avatar className="h-8 w-8 rounded-full border border-border grayscale hover:grayscale-0 transition-all">
          <AvatarImage src={user.avatar || undefined} alt={displayName} />
          <AvatarFallback className="rounded-full bg-primary/10 text-primary font-medium text-xs">
            {fallback}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-xl mt-1.5" align="end" sideOffset={5}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2.5 px-3 py-2 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-full">
              <AvatarImage src={user.avatar || undefined} alt={displayName} />
              <AvatarFallback className="rounded-full bg-primary/10 text-primary">
                {fallback}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-foreground text-xs">{displayName}</span>
              <span className="truncate text-[10px] text-muted-foreground">
                {displayEmail}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {role && role !== "guest" && (
            <DropdownMenuItem disabled className="gap-2 opacity-65 text-xs">
              <ShieldIcon className="size-3.5" />
              <span>
                {role === "super_admin"
                  ? "Super Admin"
                  : role === "admin"
                  ? "Admin"
                  : role === "worker"
                  ? "Worker"
                  : role}
              </span>
            </DropdownMenuItem>
          )}
          {role !== "worker" && (
            <DropdownMenuItem
              className="gap-2 text-xs"
              onClick={() => navigate("/settings")}
            >
              <SettingsIcon className="size-3.5" />
              <span>Settings</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          id="header-user-logout"
          className="gap-2 text-destructive focus:text-destructive text-xs cursor-pointer"
          onClick={handleSignOut}
        >
          <LogOutIcon className="size-3.5" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
