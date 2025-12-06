import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Receipt, 
  ArrowDownUp, 
  Users, 
  Settings,
  LogOut,
  Building2,
  ChevronLeft,
  BarChart3,
  LineChart,
  PieChart,
  Grid3X3,
  Package,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface AppSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  userRole?: string;
  currentLaundromat?: string;
}

const chartsNavigation = [
  { name: "CA par mois", href: "/charts/monthly", icon: BarChart3 },
  { name: "CA par jour", href: "/charts/daily", icon: LineChart },
  { name: "Paiements", href: "/charts/payments", icon: PieChart },
  { name: "Machines", href: "/charts/machines", icon: Activity },
  { name: "Heatmap", href: "/charts/heatmap", icon: Grid3X3 },
  { name: "Produits", href: "/charts/products", icon: Package },
];

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "READ_VIEWS" },
  { name: "Opérations", href: "/operations", icon: Receipt, permission: "READ_VIEWS" },
  { name: "Import / Export", href: "/import-export", icon: ArrowDownUp, permission: "IMPORT_DATA" },
];

const adminNavigation = [
  { name: "Utilisateurs", href: "/admin/users", icon: Users, permission: "MANAGE_USERS" },
  { name: "Paramètres", href: "/admin/settings", icon: Settings, permission: "MANAGE_OPTIONS" },
];

export function AppSidebar({ 
  collapsed = false, 
  onToggle,
  userRole = "USER",
  currentLaundromat = "Ma Laverie"
}: AppSidebarProps) {
  const location = useLocation();
  const [chartsOpen, setChartsOpen] = useState(true);
  
  const hasPermission = (permission: string) => {
    const adminPermissions = ["MANAGE_USERS", "MANAGE_OPTIONS", "IMPORT_DATA"];
    if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") return true;
    if (userRole === "CHECKER" && !adminPermissions.includes(permission)) return true;
    if (userRole === "USER" && permission === "READ_VIEWS") return true;
    if (userRole === "GUEST" && permission === "READ_VIEWS") return true;
    return false;
  };

  return (
    <aside 
      className={cn(
        "flex flex-col bg-sidebar h-screen transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">L</span>
            </div>
            <span className="font-display font-semibold text-sidebar-foreground">
              Lavcom
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      {/* Current Laundromat */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <NavLink 
            to="/select-laundromat"
            className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
          >
            <Building2 className="h-4 w-4" />
            <span className="text-sm truncate">{currentLaundromat}</span>
          </NavLink>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          if (!hasPermission(item.permission)) return null;
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "sidebar-item",
                isActive && "sidebar-item-active"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}

        {/* Charts Section */}
        {!collapsed && (
          <div className="pt-4 pb-2">
            <span className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
              Graphiques
            </span>
          </div>
        )}
        
        {collapsed ? (
          chartsNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "sidebar-item",
                  isActive && "sidebar-item-active"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
              </NavLink>
            );
          })
        ) : (
          <Collapsible open={chartsOpen} onOpenChange={setChartsOpen}>
            <CollapsibleTrigger className="sidebar-item w-full justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 shrink-0" />
                <span>Analyses</span>
              </div>
              <ChevronLeft className={cn("h-4 w-4 transition-transform", chartsOpen && "-rotate-90")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1">
              {chartsNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "sidebar-item text-sm",
                      isActive && "sidebar-item-active"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Admin Section */}
        {(userRole === "SUPER_ADMIN" || userRole === "ADMIN") && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-2">
                <span className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                  Administration
                </span>
              </div>
            )}
            {adminNavigation.map((item) => {
              if (!hasPermission(item.permission)) return null;
              const isActive = location.pathname === item.href;
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "sidebar-item",
                    isActive && "sidebar-item-active"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <NavLink
          to="/logout"
          className="sidebar-item text-sidebar-foreground/60 hover:text-destructive"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </NavLink>
      </div>
    </aside>
  );
}
