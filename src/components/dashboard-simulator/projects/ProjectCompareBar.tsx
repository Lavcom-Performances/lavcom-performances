import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { PROJECTS_STRINGS } from "@/constants/dashboard-simulator/projects.strings";
import { fillTemplate } from "@/components/dashboard-simulator/shared/format";

interface CompareBarProps {
  selectedIds: string[];
  onClear: () => void;
  /** Destination when 2 items are selected */
  compareTo: string;
}

export function ProjectCompareBar({ selectedIds, onClear, compareTo }: CompareBarProps) {
  if (selectedIds.length === 0) return null;

  const ready = selectedIds.length === 2;

  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit items-center gap-3 rounded-full border bg-card px-4 py-2 shadow-form">
      <span className="text-sm text-muted-foreground">
        {fillTemplate(PROJECTS_STRINGS.selectedCount, { count: selectedIds.length })}
      </span>
      {ready ? (
        <Button asChild size="sm">
          <Link to={`${compareTo}?a=${selectedIds[0]}&b=${selectedIds[1]}`}>
            {COMMON_STRINGS.actions.compareNow}
          </Link>
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">{PROJECTS_STRINGS.compareHint}</span>
      )}
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClear} aria-label="Effacer">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
