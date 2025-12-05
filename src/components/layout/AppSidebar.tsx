import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Receipt, 
  Upload, 
  Users, 
  Settings,
  LogOut,
  Building2,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  userRole?: string;
  currentLaundromat?: string;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "READ_VIEWS" },
  { name: "Opérations", href: "/operations", icon: Receipt, permission: "READ_VIEWS" },
  { name: "Imports", href: "/imports", icon: Upload, permission: "IMPORT_DATA" },
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
  
  const hasPermission = (permission: string) => {
    // Simplified permission check for V1
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
