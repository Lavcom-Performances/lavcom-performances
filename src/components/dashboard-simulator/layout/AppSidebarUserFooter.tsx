import { NavLink } from "react-router-dom";
import { UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useMockUser } from "@/components/auth/RequireAuth";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";

export function AppSidebarUserFooter() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const user = useMockUser();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {collapsed ? (
          <div className="flex justify-center">
            <ThemeToggle collapsed />
          </div>
        ) : (
          <div className="px-1">
            <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">
              {COMMON_STRINGS.nav.appearance}
            </p>
            <ThemeToggle />
          </div>
        )}
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={COMMON_STRINGS.nav.account}>
          <NavLink to="/dashboard-simulator/account">
            <UserRound />
            <span>{COMMON_STRINGS.nav.account}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton asChild size="lg" tooltip={`${user.firstName} ${user.lastName}`}>
          <NavLink to="/dashboard-simulator/account">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">
                {user.firstName} {user.lastName}
              </span>
              <span className="truncate text-xs text-sidebar-foreground/60">{user.email}</span>
            </div>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
