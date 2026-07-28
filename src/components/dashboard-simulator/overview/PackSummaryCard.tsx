import { Link } from "react-router-dom";
import { Sparkles, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardPack } from "@/hooks/dashboard-simulator/use-dashboard-pack";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { OVERVIEW_STRINGS } from "@/constants/dashboard-simulator/projects.strings";
import { fillTemplate } from "@/components/dashboard-simulator/shared/format";

export function PackSummaryCard() {
  const { data: pack, isLoading } = useDashboardPack();

  if (isLoading || !pack) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  return (
    <Card className="shadow-form">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Wallet className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-foreground">{pack.name}</p>
              <p className="text-xs text-muted-foreground">{OVERVIEW_STRINGS.packFeatures}</p>
            </div>
          </div>
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
            {COMMON_STRINGS.pack.activeBadge}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm">
              <span className="text-xl font-bold tabular-nums">{pack.usedDays}</span>{" "}
              <span className="text-muted-foreground">
                {fillTemplate(COMMON_STRINGS.pack.daysUsed, { total: pack.totalDays })}
              </span>
            </p>
            <Progress value={(pack.usedDays / pack.totalDays) * 100} className="mt-2 h-2" />
          </div>
          <div>
            <p className="text-sm">
              <span className="text-xl font-bold tabular-nums">{pack.usedProjects}</span>{" "}
              <span className="text-muted-foreground">
                {fillTemplate(COMMON_STRINGS.pack.projectsUsed, { total: pack.totalProjects })}
              </span>
            </p>
            <Progress value={(pack.usedProjects / pack.totalProjects) * 100} className="mt-2 h-2" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" className="gap-2">
            <Link to="/dashboard-simulator/purchases">
              <Sparkles className="h-4 w-4" />
              {COMMON_STRINGS.pack.addOption}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard-simulator/purchases">{COMMON_STRINGS.pack.goToPack}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
