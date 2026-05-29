import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { SimulationProject } from "@/types/simulation";
import { SURFACE_OPTIONS } from "@/hooks/useCitySearch";
import { ValidationErrors } from "@/hooks/useSimulationValidation";
import { cn } from "@/lib/utils";

function isCustomSurfaceValue(surface_m2: number): boolean {
  if (!surface_m2 || surface_m2 <= 0) return false;
  return !SURFACE_OPTIONS.some((opt) => opt.value !== "custom" && opt.value === String(surface_m2));
}

interface LocalSurfaceSectionProps {
  project: SimulationProject;
  onUpdate: (updates: Partial<SimulationProject>) => void;
  errors?: ValidationErrors;
  showErrors?: boolean;
}

export function LocalSurfaceSection({
  project,
  onUpdate,
  errors = {},
  showErrors = false,
}: LocalSurfaceSectionProps) {
  const [showCustomSurface, setShowCustomSurface] = useState(() => isCustomSurfaceValue(project.surface_m2));

  useEffect(() => {
    setShowCustomSurface(isCustomSurfaceValue(project.surface_m2));
  }, [project.surface_m2]);

  const handleSurfaceChange = (value: string) => {
    if (value === "custom") {
      setShowCustomSurface(true);
    } else {
      setShowCustomSurface(false);
      onUpdate({ surface_m2: parseFloat(value) });
    }
  };

  const getCurrentSurfaceValue = () => {
    const match = SURFACE_OPTIONS.find(
      (opt) => opt.value !== "custom" && opt.value === String(project.surface_m2)
    );
    if (match) return match.value;
    if (isCustomSurfaceValue(project.surface_m2)) return "custom";
    return "";
  };

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Surface du local</h2>
        <p className="text-muted-foreground mt-2">
          La surface influence la capacité d&apos;accueil des machines
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mx-auto max-w-xl space-y-2">
            <Label className={cn("flex items-center gap-2", showErrors && errors.surface_m2 && "text-destructive")}>
              Surface <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-3">
              <Select value={getCurrentSurfaceValue()} onValueChange={handleSurfaceChange}>
                <SelectTrigger
                  className={cn("flex-1", showErrors && errors.surface_m2 && "border-destructive focus:ring-destructive")}
                >
                  <SelectValue placeholder="Sélectionner une surface" />
                </SelectTrigger>
                <SelectContent>
                  {SURFACE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showCustomSurface && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="10"
                    max="500"
                    placeholder="m²"
                    value={project.surface_m2 || ""}
                    onChange={(e) => onUpdate({ surface_m2: parseFloat(e.target.value) || 0 })}
                    className={cn(
                      "w-24",
                      showErrors && errors.surface_m2 && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <span className="text-muted-foreground">m²</span>
                </div>
              )}
            </div>
            {showErrors && errors.surface_m2 && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.surface_m2}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
