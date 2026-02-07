import { useState } from "react";
import { Sparkles, Loader2, Check, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Suggestion {
  key: string;
  label: string;
  currentValue: number;
  suggestedValue: number;
  unit: string;
  justification: string;
}

interface AIHypothesisSuggestionProps {
  projectId: string;
  category: string;
  categoryLabel: string;
  hypotheses: Array<{
    id: string;
    key: string;
    label: string | null;
    value: number;
    unit: string | null;
  }>;
  questionnaireData?: any;
  onApplySuggestion: (key: string, value: number) => void;
}

export function AIHypothesisSuggestion({
  projectId,
  category,
  categoryLabel,
  hypotheses,
  questionnaireData,
  onApplySuggestion,
}: AIHypothesisSuggestionProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ambitionLevel, setAmbitionLevel] = useState(50); // 0 = prudent, 100 = ambitious
  const [isExpanded, setIsExpanded] = useState(false);
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set());

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setSuggestions([]);
    setAppliedKeys(new Set());
    
    try {
      const { data, error } = await supabase.functions.invoke("ai-hypothesis-suggest", {
        body: {
          projectId,
          category,
          hypotheses: hypotheses.map(h => ({
            key: h.key,
            label: h.label,
            currentValue: h.value,
            unit: h.unit,
          })),
          questionnaireData,
          ambitionLevel: ambitionLevel / 100, // 0-1 scale
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        setIsExpanded(true);
      }
    } catch (error: any) {
      toast({
        title: "Erreur IA",
        description: error.message || "Impossible de générer des suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (suggestion: Suggestion) => {
    onApplySuggestion(suggestion.key, suggestion.suggestedValue);
    setAppliedKeys(prev => new Set(prev).add(suggestion.key));
    toast({ title: "Valeur appliquée", description: `${suggestion.label} mise à jour` });
  };

  const handleApplyAll = () => {
    suggestions.forEach(s => {
      if (!appliedKeys.has(s.key)) {
        onApplySuggestion(s.key, s.suggestedValue);
      }
    });
    setAppliedKeys(new Set(suggestions.map(s => s.key)));
    toast({ title: "Toutes les valeurs appliquées" });
  };

  const formatValue = (value: number, unit: string | null): string => {
    if (unit === "%" || unit?.includes("%")) {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (unit === "€" || unit === "€/mois") {
      return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
    }
    return `${value} ${unit || ""}`.trim();
  };

  const ambitionLabel = ambitionLevel < 33 ? "Prudent" : ambitionLevel < 66 ? "Équilibré" : "Ambitieux";

  return (
    <div className="space-y-3">
      {/* AI Suggest Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSuggestions}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Proposer des valeurs
        </Button>

        {/* Ambition slider */}
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Prudent</span>
          <Slider
            value={[ambitionLevel]}
            onValueChange={([v]) => setAmbitionLevel(v)}
            max={100}
            step={10}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">Ambitieux</span>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Suggestions IA — {ambitionLabel}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleApplyAll}>
                  <Check className="h-4 w-4 mr-1" />
                  Tout appliquer
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {isExpanded && (
            <CardContent className="space-y-3">
              {suggestions.map((suggestion) => {
                const isApplied = appliedKeys.has(suggestion.key);
                const diff = suggestion.suggestedValue - suggestion.currentValue;
                const diffPercent = suggestion.currentValue !== 0 
                  ? ((diff / suggestion.currentValue) * 100).toFixed(0) 
                  : "—";

                return (
                  <div
                    key={suggestion.key}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      isApplied ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-background"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{suggestion.label}</span>
                        {isApplied && (
                          <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                            Appliqué
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground line-through">
                          {formatValue(suggestion.currentValue, suggestion.unit)}
                        </span>
                        <span className="text-primary font-medium">
                          → {formatValue(suggestion.suggestedValue, suggestion.unit)}
                        </span>
                        {diff !== 0 && (
                          <span className={cn(
                            "text-xs",
                            diff > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            ({diff > 0 ? "+" : ""}{diffPercent}%)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.justification}
                      </p>
                    </div>
                    
                    {!isApplied && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApply(suggestion)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}

              <Button
                variant="ghost"
                size="sm"
                onClick={fetchSuggestions}
                disabled={isLoading}
                className="w-full mt-2"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Régénérer les suggestions
              </Button>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
