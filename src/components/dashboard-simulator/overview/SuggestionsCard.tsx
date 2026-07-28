import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OVERVIEW_STRINGS } from "@/constants/dashboard-simulator/projects.strings";

const SUGGESTIONS = [OVERVIEW_STRINGS.suggestion1, OVERVIEW_STRINGS.suggestion2];

export function SuggestionsCard() {
  return (
    <Card className="shadow-form">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{OVERVIEW_STRINGS.suggestions}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {SUGGESTIONS.map((suggestion) => (
          <div key={suggestion} className="flex items-start gap-3 rounded-lg border p-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">{suggestion}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
