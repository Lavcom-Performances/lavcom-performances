import { Layers, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SCENARIOS_STRINGS } from "@/constants/dashboard-simulator/scenarios.strings";

export function ScenariosEmptyState({ filtered }: { filtered: boolean }) {
  const Icon = filtered ? SearchX : Layers;

  return (
    <Card className="shadow-form">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </span>
        <h3 className="font-display text-lg font-semibold text-foreground">
          {filtered ? SCENARIOS_STRINGS.noResultsTitle : SCENARIOS_STRINGS.emptyTitle}
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {filtered ? SCENARIOS_STRINGS.noResultsDescription : SCENARIOS_STRINGS.emptyDescription}
        </p>
        {!filtered && <Button className="mt-2">{SCENARIOS_STRINGS.emptyCta}</Button>}
      </CardContent>
    </Card>
  );
}
