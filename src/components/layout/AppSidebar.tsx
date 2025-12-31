import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  LayoutDashboard, 
  Receipt, 
  ArrowDownUp, 
  Users, 
  Settings,
  LogOut,
  ChevronLeft,
  BarChart3,
  LineChart,
  PieChart,
  Grid3X3,
  Package,
  Activity,
  Clock,
  Calendar,
  Timer,
  TrendingUp,
  Handshake,
  Lightbulb,
  Wrench,
  DollarSign,
  Calculator,
  Shield,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Bug
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSelector } from "@/components/ui/language-selector";
import { CompanyLogoUpload } from "./CompanyLogoUpload";
import { TrialBanner } from "@/components/trial/TrialBanner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSites } from "@/hooks/useSites";
import { useState, useEffect, useMemo } from "react";

interface AppSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  userRole?: string;
  currentLaundromat?: string;
}

export function AppSidebar({ 
  collapsed = false, 
  onToggle,
  userRole = "USER",
  currentLaundromat = "Ma Laverie"
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['app', 'common']);
  const [chartsOpen, setChartsOpen] = useState(true);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Trigger stagger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const { signOut, profile } = useAuth();
  const { daysRemaining, trialStatus, planType } = useSubscription();
  const { isAdmin } = useIsAdmin();
  const { getDefaultSite } = useSites();

  // Generate report issue URL with pre-filled params
  const getReportIssueUrl = () => {
    const defaultSite = getDefaultSite();
    const params = new URLSearchParams({
      topic: 'bug',
      page: location.pathname,
      ...(defaultSite?.name && { site: defaultSite.name }),
    });
    return `/help?${params.toString()}#contact-form`;
  };

  const getInitials = () => {
    const first = profile?.first_name?.charAt(0)?.toUpperCase() || "";
    const last = profile?.last_name?.charAt(0)?.toUpperCase() || "";
    return first + last || "?";
  };

  const chartsNavigation = [
    { name: t('app:charts.annualRevenue'), href: "/charts/annual", icon: TrendingUp },
    { name: t('app:charts.monthlyRevenue'), href: "/charts/monthly", icon: BarChart3 },
    { name: t('app:charts.dailyRevenue'), href: "/charts/daily", icon: LineChart },
    { name: t('app:charts.payments'), href: "/charts/payments", icon: PieChart },
    { name: t('app:charts.machines'), href: "/charts/machines", icon: Activity },
    { name: t('app:charts.occupancyRate'), href: "/charts/occupancy", icon: Activity },
    { name: t('app:charts.hourlyFreq'), href: "/charts/hourly", icon: Clock },
    { name: t('app:charts.dailyFreq'), href: "/charts/daily-freq", icon: Calendar },
    { name: t('app:charts.halfHourlyFreq'), href: "/charts/half-hourly", icon: Timer },
    { name: t('app:charts.heatmap'), href: "/charts/heatmap", icon: Grid3X3 },
    { name: t('app:charts.products'), href: "/charts/products", icon: Package },
  ];

  const navigation = [
    { name: t('app:nav.dashboard'), href: "/dashboard", icon: LayoutDashboard, permission: "READ_VIEWS" },
    { name: t('app:nav.profitability'), href: "/profitability", icon: DollarSign, permission: "READ_VIEWS" },
    { name: t('app:nav.recommendations'), href: "/recommendations", icon: Lightbulb, permission: "READ_VIEWS" },
    { name: t('app:nav.maintenance'), href: "/maintenance", icon: Wrench, permission: "READ_VIEWS" },
    { name: t('app:nav.operations'), href: "/operations", icon: Receipt, permission: "READ_VIEWS" },
    { name: t('app:nav.importExport'), href: "/import-export", icon: ArrowDownUp, permission: "IMPORT_DATA" },
  ];

  const bottomNavigation = [
    { name: t('app:nav.simulation'), href: "/simulation", icon: Calculator, permission: "READ_VIEWS" },
  ];

  const adminNavigation = [
    { name: t('app:nav.users'), href: "/admin/users", icon: Users, permission: "MANAGE_USERS" },
    { name: "Demandes experts", href: "/admin/expert-requests", icon: Handshake, permission: "MANAGE_USERS" },
    { name: "Gestion des rôles", href: "/roles-management", icon: ShieldCheck, permission: "MANAGE_USERS" },
    { name: "Statut système", href: "/admin/status", icon: AlertTriangle, permission: "MANAGE_USERS" },
    { name: t('app:nav.settings'), href: "/settings", icon: Settings, permission: "READ_VIEWS" },
    { name: t('app:nav.security'), href: "/settings?tab=security", icon: Shield, permission: "MANAGE_OPTIONS" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  useEffect(() => {
    const savedLogo = localStorage.getItem("company_logo");
    if (savedLogo) {
      setCompanyLogo(savedLogo);
    }
  }, []);
  
  const hasPermission = (permission: string) => {
    const adminPermissions = ["MANAGE_USERS", "MANAGE_OPTIONS", "IMPORT_DATA"];
    if (userRole === "SUPER_ADMIN" || userRole === "ADMIN") return true;
    if (userRole === "CHECKER" && !adminPermissions.includes(permission)) return true;
    if (userRole === "USER" && permission === "READ_VIEWS") return true;
    if (userRole === "GUEST" && permission === "READ_VIEWS") return true;
    return false;
  };

  const showTrialBanner = planType === 'trial';

  return (
    <aside 
      data-tutorial="sidebar"
      className={cn(
        "flex flex-col bg-sidebar h-screen border-r border-sidebar-border",
        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              {collapsed ? (
                <a 
                  href="/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center cursor-pointer hover:opacity-80 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-sidebar mx-auto"
                >
                  <span className="text-primary-foreground font-bold text-sm">LP</span>
                </a>
              ) : (
                <a 
                  href="/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:opacity-80 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-sidebar rounded-lg"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-transform duration-200 hover:scale-105">
                    <span className="text-primary-foreground font-bold text-sm">LP</span>
                  </div>
                  <span className="font-display font-semibold text-sidebar-foreground">
                    Lavcom
                  </span>
                </a>
              )}
            </TooltipTrigger>
            <TooltipContent side="right" className="hidden md:block">
              <p>{t('app:nav.backToHome')}</p>
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
            className="text-sidebar-foreground hover:bg-sidebar-accent transition-transform duration-200 hover:scale-110"
          >
            <ChevronLeft className="h-4 w-4 transition-transform duration-300" />
          </Button>
        </div>
      </div>
      
      {/* Collapse toggle for collapsed state */}
      <div className={cn(
        "flex justify-center border-b border-sidebar-border overflow-hidden transition-all duration-300 ease-out",
        collapsed ? "py-2 max-h-12 opacity-100" : "py-0 max-h-0 opacity-0"
      )}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 transition-transform duration-200 hover:scale-110"
        >
          <ChevronLeft className="h-4 w-4 rotate-180 transition-transform duration-300" />
        </Button>
      </div>

      {/* Trial Banner - only show when not collapsed and on trial */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-out",
        !collapsed && showTrialBanner ? "py-2 max-h-24 opacity-100" : "py-0 max-h-0 opacity-0"
      )}>
        <TrialBanner 
          daysRemaining={daysRemaining} 
          status={trialStatus}
          variant="sidebar"
        />
      </div>

      {/* Current Laundromat */}
      <div className={cn(
        "border-b border-sidebar-border overflow-hidden transition-all duration-300 ease-out",
        collapsed ? "px-0 py-0 max-h-0 opacity-0" : "px-4 py-3 max-h-24 opacity-100"
      )}>
        <div className="space-y-2">
          <NavLink 
            to="/laundromat-settings"
            className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
          >
            <CompanyLogoUpload 
              logo={companyLogo} 
              onLogoChange={setCompanyLogo}
              size="sm"
            />
            <span className="text-sm truncate flex-1">{currentLaundromat}</span>
            <Settings className="h-3 w-3 ml-auto opacity-50 transition-opacity duration-200" />
          </NavLink>
          <NavLink 
            to="/select-laundromat"
            className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <span>← {t('app:nav.changeLaundry')}</span>
          </NavLink>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item, index) => {
          if (!hasPermission(item.permission)) return null;
          const isActive = location.pathname === item.href;
          const visibleIndex = navigation.slice(0, index).filter(n => hasPermission(n.permission)).length;
          
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "sidebar-item",
                isActive && "sidebar-item-active",
                "opacity-0 translate-x-[-10px]",
                mounted && "animate-nav-item-in"
              )}
              style={{ 
                animationDelay: mounted ? `${visibleIndex * 50}ms` : '0ms',
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
          );
        })}

        {/* Charts Section */}
        {!collapsed && (
          <div className="pt-4 pb-2">
            <span className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
              {t('app:nav.charts')}
            </span>
          </div>
        )}
        
        {collapsed ? (
          chartsNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.href}
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
            <CollapsibleTrigger className="sidebar-item w-full justify-between group">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                <span>{t('app:nav.analyses')}</span>
              </div>
              <ChevronLeft className={cn(
                "h-4 w-4 transition-transform duration-300 ease-out",
                chartsOpen && "-rotate-90"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1">
              {chartsNavigation.map((item, index) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "sidebar-item text-sm",
                      isActive && "sidebar-item-active",
                      chartsOpen && "animate-nav-item-in"
                    )}
                    style={{ 
                      animationDelay: `${index * 30}ms`,
                      animationFillMode: 'forwards'
                    }}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Simulator Section - at bottom before admin */}
        {!collapsed && (
          <div className="pt-6 pb-2">
            <span className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
              Outils
            </span>
          </div>
        )}
        {bottomNavigation.map((item, index) => {
          if (!hasPermission(item.permission)) return null;
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "sidebar-item",
                isActive && "sidebar-item-active",
                mounted && "animate-nav-item-in"
              )}
              style={{ 
                animationDelay: mounted ? `${(navigation.length + chartsNavigation.length + index) * 50}ms` : '0ms',
                animationFillMode: 'forwards'
              }}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className={cn(
                "transition-all duration-300 ease-out whitespace-nowrap",
                collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              )}>
                {item.name}
              </span>
            </NavLink>
          );
        })}

        {/* Super Admin Section - Only for platform admins */}
        {isAdmin && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-2">
                <span className="px-3 text-xs font-medium text-destructive/70 uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
            )}
            <NavLink
              to="/admin"
              className={cn(
                "sidebar-item",
                location.pathname.startsWith("/admin") && "sidebar-item-active",
                mounted && "animate-nav-item-in"
              )}
            >
              <ShieldCheck className="h-5 w-5 shrink-0 text-destructive" />
              {!collapsed && <span className="text-destructive">Admin Lavcom</span>}
            </NavLink>
          </>
        )}

        {/* Admin Section */}
        {(userRole === "SUPER_ADMIN" || userRole === "ADMIN") && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-2">
                <span className="px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                  {t('app:nav.administration')}
                </span>
              </div>
            )}
            {adminNavigation.map((item, index) => {
              if (!hasPermission(item.permission)) return null;
              const isActive = location.pathname === item.href;
              const visibleIndex = adminNavigation.slice(0, index).filter(n => hasPermission(n.permission)).length;
              
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "sidebar-item",
                    isActive && "sidebar-item-active",
                    mounted && "animate-nav-item-in"
                  )}
                  style={{ 
                    animationDelay: mounted ? `${(navigation.length + visibleIndex) * 50}ms` : '0ms',
                    animationFillMode: 'forwards'
                  }}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* User Section - Compact */}
      <div className="px-3 py-2 border-t border-sidebar-border space-y-0.5">
        {/* Help link */}
        <NavLink
          to="/help"
          className={cn(
            "sidebar-item !py-1.5",
            location.pathname === "/help" && "sidebar-item-active"
          )}
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{t('app:nav.help')}</span>}
        </NavLink>
        {/* Report issue link */}
        <NavLink
          to={getReportIssueUrl()}
          className="sidebar-item !py-1.5 text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          <Bug className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">{t('app:reportIssue.title')}</span>}
        </NavLink>
        <NavLink
          to="/profile"
          className={cn(
            "sidebar-item !py-1.5",
            location.pathname === "/profile" && "sidebar-item-active"
          )}
        >
          <Avatar className="h-4 w-4 shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && <span>{t('app:nav.profile')}</span>}
        </NavLink>
        <NavLink
          to="/subscription"
          className={cn(
            "sidebar-item !py-1.5",
            location.pathname === "/subscription" && "sidebar-item-active"
          )}
        >
          <CreditCard className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{t('app:nav.subscription')}</span>}
        </NavLink>
        <div className="flex items-center gap-1">
          <ThemeToggle collapsed={collapsed} className="sidebar-item !py-1.5 flex-1" />
          {!collapsed && <LanguageSelector variant="sidebar" collapsed={collapsed} />}
        </div>
        {collapsed && <LanguageSelector variant="sidebar" collapsed={collapsed} />}
        <div className="flex items-center gap-1 pt-1">
          <NavLink
            to="/"
            className="sidebar-item !py-1.5 flex-1 text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-xs">{t('common:home')}</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className="sidebar-item !py-1.5 text-sidebar-foreground/60 hover:text-destructive"
            title={t('common:logout')}
          >
            <LogOut className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>
    </aside>
  );
}
