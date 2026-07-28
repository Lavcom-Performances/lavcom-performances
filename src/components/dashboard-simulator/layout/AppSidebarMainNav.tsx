import { LayoutDashboard, FolderKanban, CreditCard, FileText } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { AppSidebarProjectsNav } from "./AppSidebarProjectsNav";

const ITEMS = [
  { title: COMMON_STRINGS.nav.overview, url: "/dashboard-simulator", icon: LayoutDashboard, exact: true },
  { title: COMMON_STRINGS.nav.purchases, url: "/dashboard-simulator/purchases", icon: CreditCard, exact: false },
  { title: COMMON_STRINGS.nav.reports, url: "/dashboard-simulator/reports", icon: FileText, exact: false },
];

export function AppSidebarMainNav() {
  const { pathname } = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === ITEMS[0].url}
              tooltip={ITEMS[0].title}
            >
              <NavLink to={ITEMS[0].url} end>
                <LayoutDashboard />
                <span>{ITEMS[0].title}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <AppSidebarProjectsNav icon={FolderKanban} />

          {ITEMS.slice(1).map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.url)}
                tooltip={item.title}
              >
                <NavLink to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
