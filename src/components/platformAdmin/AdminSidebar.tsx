import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  TrendingUp, 
  CreditCard, 
  FileText, 
  Package, 
  BarChart3,
  ShieldCheck,
  Key,
  ScrollText,
  History,
  AlertTriangle,
  Handshake,
  Clock,
  LogOut,
  ChevronLeft,
  ArrowLeftRight,
  FileQuestion,
  FileX2,
  Bot,
  Archive,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformRole } from "@/hooks/usePlatformRole";
import { useLogout } from "@/hooks/useLogout";
import { getLastSaasPath } from "@/lib/navigation/lastPaths";
import { setAppContext } from "@/lib/navigation/appContext";
import { useState, useEffect } from "react";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function AdminSidebar({ 
  collapsed = false, 
  onToggle
}: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['app', 'common']);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const { profile } = useAuth();
  const { isPlatformBilling } = usePlatformRole();
  const { logout } = useLogout();

  const getInitials = () => {
    const first = profile?.first_name?.charAt(0)?.toUpperCase() || "";
    const last = profile?.last_name?.charAt(0)?.toUpperCase() || "";
    return first + last || "?";
  };

  // Main navigation items for platform admins
  const mainNavigation = [
    { name: t('app:platformAdmin.nav.overview'), href: "/admin", icon: LayoutDashboard },
    { name: t('app:platformAdmin.nav.users'), href: "/admin/users", icon: Users },
    { name: t('app:platformAdmin.nav.sites'), href: "/admin/sites", icon: Building2 },
    { name: t('app:platformAdmin.nav.analytics'), href: "/admin/analytics", icon: TrendingUp },
    { name: t('app:platformAdmin.nav.roles'), href: "/admin/roles", icon: ShieldCheck },
    { name: t('app:platformAdmin.nav.permissions'), href: "/admin/permissions", icon: Key },
    { name: t('app:platformAdmin.nav.auditLogs'), href: "/admin/audit-logs", icon: ScrollText },
    { name: t('app:platformAdmin.nav.archives', 'Archives'), href: "/admin/archives", icon: Archive },
    { name: t('app:platformAdmin.nav.complianceReports', 'Compliance Reports'), href: "/admin/compliance-reports", icon: ClipboardCheck },
    { name: t('app:platformAdmin.nav.loginHistory'), href: "/admin/login-history", icon: History },
  ];

  // Billing/sales navigation - only for users with billing access
  const billingNavigation = isPlatformBilling ? [
    { name: t('app:platformAdmin.nav.salesOverview'), href: "/admin/sales", icon: CreditCard },
    { name: t('app:platformAdmin.nav.invoices'), href: "/admin/sales/invoices", icon: FileText },
    { name: t('app:platformAdmin.nav.products'), href: "/admin/sales/products", icon: Package },
    { name: t('app:platformAdmin.nav.reports'), href: "/admin/sales/reports", icon: BarChart3 },
  ] : [];

  // System navigation
  const systemNavigation = [
    { name: t('app:platformAdmin.nav.systemStatus'), href: "/admin/system-status", icon: AlertTriangle },
    { name: t('app:platformAdmin.nav.aiUsage', 'AI Usage'), href: "/admin/ai-usage", icon: Bot },
    { name: t('app:platformAdmin.nav.expertRequests'), href: "/admin/expert-requests", icon: Handshake },
    { name: t('app:platformAdmin.nav.cronLogs'), href: "/admin/cron-logs", icon: Clock },
    { name: t('app:platformAdmin.nav.orphanPages', 'Orphan Pages'), href: "/admin/orphan-pages", icon: FileQuestion },
    { name: t('app:platformAdmin.nav.orphanFiles', 'Orphan Files'), href: "/admin/orphan-files", icon: FileX2 },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const handleSwitchToSaas = () => {
    // Set context to saas so SelectLaundromat doesn't redirect back to admin
    setAppContext('saas');
    const lastPath = getLastSaasPath();
    navigate(lastPath || '/select-laundromat');
  };

  return (
    <aside 
      className={cn(
        "flex flex-col h-screen border-r",
        // Admin theme: deep blue gradient matching LAVCOM logo background
        "bg-gradient-to-b from-[#3D4B7A] via-[#4A5A8C] to-[#5C6B9A]",
        "border-[#5C6B9A]/50",
        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#6B7AA0]/30">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              {collapsed ? (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#A3C615] to-[#8AAD12] flex items-center justify-center cursor-pointer hover:opacity-80 hover:scale-105 transition-all duration-200 mx-auto">
                  <span className="text-white font-bold text-sm">LP</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#A3C615] to-[#8AAD12] flex items-center justify-center transition-transform duration-200 hover:scale-105">
                    <span className="text-white font-bold text-sm">LP</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display font-semibold text-sm">
                      <span className="text-[#A3C615]">LAV</span>
                      <span className="text-[#FCD259]">COM</span>
                    </span>
                    <span className="text-[10px] text-[#7DD3E8] font-medium uppercase tracking-wider">
                      {t('app:platformAdmin.title')}
                    </span>
                  </div>
                </div>
              )}
            </TooltipTrigger>
            <TooltipContent side="right" className="hidden md:block">
              <p>{t('app:platformAdmin.title')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className={cn(
          "transition-all duration-300 ease-out",
          collapsed ? "opacity-0 scale-75 w-0" : "opacity-100 scale-100"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-[#A8B4D0] hover:bg-[#5C6B9A]/50 transition-transform duration-200 hover:scale-110"
          >
            <ChevronLeft className="h-4 w-4 transition-transform duration-300" />
          </Button>
        </div>
      </div>
      
      {/* Collapse toggle for collapsed state */}
      <div className={cn(
        "flex justify-center border-b border-[#6B7AA0]/30 overflow-hidden transition-all duration-300 ease-out",
        collapsed ? "py-2 max-h-12 opacity-100" : "py-0 max-h-0 opacity-0"
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-[#A8B4D0] hover:bg-[#5C6B9A]/50 h-8 w-8 transition-transform duration-200 hover:scale-110"
        >
          <ChevronLeft className="h-4 w-4 rotate-180 transition-transform duration-300" />
        </Button>
      </div>

      {/* Switch to SaaS button */}
      <div className={cn(
        "px-3 py-3 border-b border-[#6B7AA0]/30"
      )}>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={handleSwitchToSaas}
                className={cn(
                  "w-full justify-start gap-2 text-[#A8B4D0] hover:text-white hover:bg-[#5C6B9A]/50",
                  collapsed && "justify-center px-2"
                )}
              >
                <ArrowLeftRight className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="text-sm">{t('app:platformAdmin.switchToSaas')}</span>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                <p>{t('app:platformAdmin.switchToSaas')}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Main Section */}
        {!collapsed && (
          <div className="pb-2">
            <span className="px-3 text-xs font-medium text-[#7DD3E8]/70 uppercase tracking-wider">
              {t('app:platformAdmin.sections.main')}
            </span>
          </div>
        )}
        {mainNavigation.map((item, index) => {
          const isActive = location.pathname === item.href || 
            (item.href === '/admin' && location.pathname === '/admin');
          
          return (
            <TooltipProvider key={item.href} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.href}
                    className={cn(
                      "admin-sidebar-item",
                      isActive && "admin-sidebar-item-active",
                      "opacity-0 translate-x-[-10px]",
                      mounted && "animate-nav-item-in"
                    )}
                    style={{ 
                      animationDelay: mounted ? `${index * 50}ms` : '0ms',
                      animationFillMode: 'forwards'
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0 transition-transform duration-200" />
                    <span className={cn(
                      "transition-all duration-300 ease-out whitespace-nowrap",
                      collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                    )}>
                      {item.name}
                    </span>
                  </NavLink>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    <p>{item.name}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {/* Billing Section */}
        {billingNavigation.length > 0 && (
          <>
            {!collapsed && (
              <div className="pt-6 pb-2">
                <span className="px-3 text-xs font-medium text-[#7DD3E8]/70 uppercase tracking-wider">
                  {t('app:platformAdmin.sections.billing')}
                </span>
              </div>
            )}
            {billingNavigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              
              return (
                <TooltipProvider key={item.href} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.href}
                        className={cn(
                          "admin-sidebar-item",
                          isActive && "admin-sidebar-item-active",
                          mounted && "animate-nav-item-in"
                        )}
                        style={{ 
                          animationDelay: mounted ? `${(mainNavigation.length + index) * 50}ms` : '0ms',
                          animationFillMode: 'forwards'
                        }}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>{item.name}</span>}
                      </NavLink>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        <p>{item.name}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </>
        )}

        {/* System Section */}
        {!collapsed && (
          <div className="pt-6 pb-2">
            <span className="px-3 text-xs font-medium text-[#7DD3E8]/70 uppercase tracking-wider">
              {t('app:platformAdmin.sections.system')}
            </span>
          </div>
        )}
        {systemNavigation.map((item, index) => {
          const isActive = location.pathname === item.href;
          
          return (
            <TooltipProvider key={item.href} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.href}
                    className={cn(
                      "admin-sidebar-item",
                      isActive && "admin-sidebar-item-active",
                      mounted && "animate-nav-item-in"
                    )}
                    style={{ 
                      animationDelay: mounted ? `${(mainNavigation.length + billingNavigation.length + index) * 50}ms` : '0ms',
                      animationFillMode: 'forwards'
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </NavLink>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    <p>{item.name}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="px-3 py-3 border-t border-[#6B7AA0]/30 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
            <AvatarFallback className="text-xs bg-[#A3C615] text-white">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-[#A8B4D0] truncate">
                {profile?.email}
              </p>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <ThemeToggle collapsed={collapsed} className="admin-sidebar-item !py-1.5 flex-1" />
          {!collapsed && <LanguageSelector variant="sidebar" collapsed={collapsed} />}
        </div>
        {collapsed && <LanguageSelector variant="sidebar" collapsed={collapsed} />}
        
        <button
          onClick={handleLogout}
          className="admin-sidebar-item w-full justify-start !py-2 text-[#A8B4D0] hover:text-red-400"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{t('common:logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
