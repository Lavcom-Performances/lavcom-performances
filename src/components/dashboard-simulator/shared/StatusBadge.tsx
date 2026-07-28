import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import type { DashboardStatus } from "@/types/dashboard-simulator";

interface StatusBadgeProps {
  status: DashboardStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const validated = status === "validated";

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border-transparent px-2.5 py-0.5 text-xs font-medium",
        validated
          ? "bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {validated ? COMMON_STRINGS.status.validated : COMMON_STRINGS.status.in_progress}
    </Badge>
  );
}
