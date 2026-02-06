import { Outlet, useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  FolderKanban, 
  Settings2, 
  TrendingUp, 
  GitBranch, 
  Download,
  ChevronLeft 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinAccess } from "@/hooks/useFinAccess";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const navItems = [
  { path: "/projections", label: "Mes projets", icon: FolderKanban },
  { path: "/projections/hypotheses", label: "Hypothèses", icon: Settings2 },
  { path: "/projections/previsionnel", label: "Prévisionnel", icon: TrendingUp },
  { path: "/projections/scenarios", label: "Scénarios", icon: GitBranch },
  { path: "/projections/exports", label: "Exports", icon: Download },
];

export function FinProjectLayout() {
  const location = useLocation();
  const { access } = useFinAccess();
  
  const isExpired = !access?.has_access && access?.reason === "expired";
  const accessEndsAt = access?.access_ends_at ? new Date(access.access_ends_at) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">Retour</span>
          </Link>
          
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Outil de projection financière</h1>
            {accessEndsAt && !isExpired && (
              <p className="text-xs text-muted-foreground">
                Accès jusqu'au {format(accessEndsAt, "d MMMM yyyy", { locale: fr })}
              </p>
            )}
          </div>
          
          {isExpired && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-destructive">Accès expiré</span>
              <Button size="sm" asChild>
                <Link to="/subscribe-simulator">Renouveler</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-56 flex-col border-r bg-card min-h-[calc(100vh-3.5rem)] sticky top-14">
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== "/projections" && location.pathname.startsWith(item.path));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          
          {access && (
            <div className="p-4 border-t text-xs text-muted-foreground space-y-1">
              <p>Pack : {access.plan_code || "Essential"}</p>
              <p>Projets : {access.current_projects}/{access.max_projects}</p>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
