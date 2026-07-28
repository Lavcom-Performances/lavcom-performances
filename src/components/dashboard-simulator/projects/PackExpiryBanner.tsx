import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useDashboardPack } from "@/hooks/dashboard-simulator/use-dashboard-pack";
import { PROJECTS_STRINGS } from "@/constants/dashboard-simulator/projects.strings";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { fillTemplate } from "@/components/dashboard-simulator/shared/format";

export function PackExpiryBanner() {
  const { data: pack } = useDashboardPack();
  if (!pack) return null;

  const remaining = pack.totalDays - pack.usedDays;
  if (remaining > 60) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-sm text-foreground">
        {fillTemplate(PROJECTS_STRINGS.expiryBanner, { days: remaining })}
      </p>
      <Link
        to="/dashboard-simulator/purchases"
        className="text-sm font-medium text-primary hover:underline"
      >
        {COMMON_STRINGS.pack.addOption}
      </Link>
    </div>
  );
}
