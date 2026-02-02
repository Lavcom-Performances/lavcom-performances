import { X, Check, ArrowRight, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useBetaOnboarding } from "@/hooks/useBetaOnboarding";

interface BetaChecklistProps {
  onClose?: () => void;
  variant?: "card" | "inline";
}

export function BetaChecklist({ onClose, variant = "card" }: BetaChecklistProps) {
  const {
    checklistItems,
    completedCount,
    completionPercentage,
    isChecklistComplete,
  } = useBetaOnboarding();

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <ListChecks className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Checklist de démarrage</h3>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{checklistItems.length} étapes complétées
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Progress value={completionPercentage} className="h-2 mb-4" />

      {isChecklistComplete ? (
        <div className="text-center py-4">
          <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
            <Check className="h-6 w-6 text-green-500" />
          </div>
          <p className="font-medium text-foreground">Checklist complétée !</p>
          <p className="text-sm text-muted-foreground">Merci d'avoir pris le temps de vous familiariser avec Lavcom.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {checklistItems.map((item) => (
            <li key={item.id}>
              <Link
                to={item.link}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  item.completed
                    ? "bg-muted/50 border-muted"
                    : "hover:bg-muted/30 border-border hover:border-primary/30"
                )}
              >
                <div
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    item.completed
                      ? "bg-green-500 text-white"
                      : "border-2 border-muted-foreground/30"
                  )}
                >
                  {item.completed && <Check className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      item.completed ? "text-muted-foreground line-through" : "text-foreground"
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                {!item.completed && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (variant === "inline") {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <Card className="border-primary/20 shadow-lg mb-6">
      <CardContent className="pt-6">{content}</CardContent>
    </Card>
  );
}
