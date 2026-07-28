import { FileText, FolderPlus, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardActivity } from "@/hooks/dashboard-simulator/use-dashboard-pack";
import { OVERVIEW_STRINGS } from "@/constants/dashboard-simulator/projects.strings";

const ICONS = {
  scenario: Layers,
  report: FileText,
  project: FolderPlus,
} as const;

export function RecentActivityCard() {
  const { data: activity, isLoading } = useDashboardActivity();

  return (
    <Card className="shadow-form">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{OVERVIEW_STRINGS.recentActivity}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || !activity
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
          : activity.map((item) => {
              const Icon = ICONS[item.kind];
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
                  </div>
                </div>
              );
            })}
      </CardContent>
    </Card>
  );
}
