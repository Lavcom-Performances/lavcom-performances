import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
}

export function PackChoiceCard({ name, price, features, highlight }: Props) {
  return (
    <Card
      className={cn(
        "relative flex flex-col shadow-form",
        highlight && "border-primary ring-2 ring-primary/30"
      )}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          Recommandé
        </div>
      )}
      <CardContent className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <div className="text-sm font-medium text-muted-foreground">{name}</div>
          <div className="mt-1 font-display text-3xl font-bold text-foreground">{price}</div>
        </div>
        <ul className="flex-1 space-y-2 text-sm text-foreground">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
