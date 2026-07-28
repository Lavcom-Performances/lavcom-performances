import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { COMPARISON_STRINGS } from "@/constants/dashboard-simulator/comparison.strings";

export function ComparisonSynthesisCard({ points }: { points: string[] }) {
  return (
    <Card className="shadow-form">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COMPARISON_STRINGS.synthesisTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {points.map((point) => (
          <div key={point} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">{point}</p>
          </div>
        ))}
        <p className="pt-2 text-xs text-muted-foreground">{COMPARISON_STRINGS.footerHint}</p>
      </CardContent>
    </Card>
  );
}
