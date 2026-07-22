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
  const { admin, signOut } = useAuth();
  const navigate = useNavigate();

  // Prefer live admin data when available
  const displayName = admin?.full_name ?? user.name;
  const displayEmail = admin?.email ?? user.email;
  const fallback = displayName.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none flex items-center gap-2 hover:opacity-85 transition-opacity">
        <Avatar className="h-8 w-8 rounded-full border border-border grayscale hover:grayscale-0 transition-all">
          <AvatarImage src={user.avatar} alt={displayName} />
          <AvatarFallback className="rounded-full bg-primary/10 text-primary font-medium text-xs">
            {fallback}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-xl mt-1.5" align="end" sideOffset={5}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2.5 px-3 py-2 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-full">
              <AvatarImage src={user.avatar} alt={displayName} />
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
          {admin?.role && (
            <DropdownMenuItem disabled className="gap-2 opacity-65 text-xs">
              <ShieldIcon className="size-3.5" />
              <span>
                {admin.role === "super_admin"
                  ? "Super Admin"
                  : admin.role === "admin"
                  ? "Admin"
                  : "Warehouse"}
              </span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="gap-2 text-xs"
            onClick={() => navigate("/settings")}
          >
            <SettingsIcon className="size-3.5" />
            <span>Settings</span>
          </DropdownMenuItem>
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
