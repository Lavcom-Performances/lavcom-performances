import { useState } from "react";
import { FormCard, CardContent, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Input } from "@/components/ui/input";
import { Ruler } from "lucide-react";
import { FormField } from "./FormField";

function getSurfaceHint(value: string): string | undefined {
  const num = Number(value);
  if (value === "" || Number.isNaN(num) || num <= 0) {
    return undefined;
  }

  if (num < 20) return "Surface très petite pour une laverie";
  if (num < 30) return `${num} m² — Micro laverie`;
  if (num < 40) return `${num} m² — Petite laverie`;
  if (num < 50) return `${num} m² — Laverie standard`;
  if (num < 60) return `${num} m² — Laverie moyenne`;
  if (num < 80) return `${num} m² — Grande laverie`;
  if (num < 100) return `${num} m² — Très grande laverie`;
  return `${num} m² — Laverie XXL`;
}

export function SurfaceCard() {
  const [surface, setSurface] = useState("");
  const hint = getSurfaceHint(surface);

  return (
    <FormCard className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-5 w-5 text-primary" />
          Surface du local
          <span className="text-sm font-medium text-destructive">*</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FormField label="Surface totale du local en m²" htmlFor="surface" required hint={hint}>
          <div className="flex items-center gap-2">
            <Input
              id="surface"
              type="number"
              placeholder="Ex: 40"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
            />
            <span className="text-sm text-muted-foreground shrink-0">m²</span>
          </div>
        </FormField>
      </CardContent>
    </FormCard>
  );
}
