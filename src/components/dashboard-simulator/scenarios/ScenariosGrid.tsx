import { Skeleton } from "@/components/ui/skeleton";
import { ScenarioCard } from "./ScenarioCard";
import { ScenariosEmptyState } from "./ScenariosEmptyState";
import type { DashboardScenario } from "@/types/dashboard-simulator";

interface ScenariosGridProps {
  scenarios: DashboardScenario[] | undefined;
  isLoading: boolean;
  projectLocation: string;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  filtered: boolean;
}

export function ScenariosGrid({
  scenarios,
  isLoading,
  projectLocation,
  selectedIds,
  onToggleSelect,
  filtered,
}: ScenariosGridProps) {
  if (isLoading || !scenarios) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (scenarios.length === 0) {
    return <ScenariosEmptyState filtered={filtered} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {scenarios.map((scenario) => (
        <ScenarioCard
          key={scenario.id}
          scenario={scenario}
          projectLocation={projectLocation}
          selected={selectedIds.includes(scenario.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
