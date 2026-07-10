import { FormCard, CardContent, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Input } from "@/components/ui/input";
import { Ruler } from "lucide-react";
import { FormField } from "./FormField";

export function SurfaceCard() {
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
        <FormField label="Surface totale du local en m²" htmlFor="surface" required>
          <div className="flex items-center gap-2">
            <Input id="surface" type="number" placeholder="Ex: 40" />
            <span className="text-sm text-muted-foreground shrink-0">m²</span>
          </div>
        </FormField>
      </CardContent>
    </FormCard>
  );
}
