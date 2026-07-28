import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSidebar } from "@/components/ui/sidebar";
import { useDashboardPack } from "@/hooks/dashboard-simulator/use-dashboard-pack";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { fillTemplate } from "@/components/dashboard-simulator/shared/format";

export function AppSidebarPackWidget() {
  const { state } = useSidebar();
  const { data: pack } = useDashboardPack();

  if (state === "collapsed" || !pack) return null;

  return (
    <div className="mx-2 mb-2 rounded-lg border bg-sidebar-accent/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-sidebar-foreground">{pack.name}</p>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
          {COMMON_STRINGS.pack.activeBadge}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <p className="text-xs text-sidebar-foreground/70">
            {pack.usedDays} {fillTemplate(COMMON_STRINGS.pack.daysUsed, { total: pack.totalDays })}
          </p>
          <Progress value={(pack.usedDays / pack.totalDays) * 100} className="mt-1 h-1.5" />
        </div>
        <div>
          <p className="text-xs text-sidebar-foreground/70">
            {pack.usedProjects}{" "}
            {fillTemplate(COMMON_STRINGS.pack.projectsUsed, { total: pack.totalProjects })}
          </p>
          <Progress value={(pack.usedProjects / pack.totalProjects) * 100} className="mt-1 h-1.5" />
        </div>
      </div>

      <Button
        asChild
        size="sm"
        variant="outline"
        className="mt-3 w-full gap-2 border-sidebar-border bg-transparent text-xs text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Link to="/dashboard-simulator/purchases">
          <Sparkles className="h-3.5 w-3.5" />
          {COMMON_STRINGS.pack.addOption}
        </Link>
      </Button>
    </div>
  );
}
