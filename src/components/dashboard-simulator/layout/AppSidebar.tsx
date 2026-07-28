import { Link } from "react-router-dom";
import { WashingMachine } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { AppSidebarMainNav } from "./AppSidebarMainNav";
import { AppSidebarPackWidget } from "./AppSidebarPackWidget";
import { AppSidebarUserFooter } from "./AppSidebarUserFooter";

/** Sidebar dedicated to the project-holder dashboard. Never shared with the operator app. */
export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          to="/dashboard-simulator"
          className="flex items-center gap-2 px-2 py-1.5 text-sidebar-foreground"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <WashingMachine className="h-4 w-4" />
          </span>
          <span className="truncate font-display text-sm font-bold group-data-[collapsible=icon]:hidden">
            {COMMON_STRINGS.appName}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <AppSidebarMainNav />
      </SidebarContent>

      <SidebarFooter>
        <AppSidebarPackWidget />
        <AppSidebarUserFooter />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
