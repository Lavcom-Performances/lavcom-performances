import { FormCard, CardContent } from "@/components/ui/form-card";
import { Input } from "@/components/ui/input";
import { Ruler } from "lucide-react";
import { FormField } from "./FormField";

export function SurfaceCard() {
  return (
    <FormCard>
      <CardContent className="pt-6">
        <FormField
          label="Surface du local"
          htmlFor="surface"
          icon={Ruler}
          required
          hint="Surface totale en m² (ex : 45)"
        >
          <div className="relative">
            <Input
              id="surface"
              type="number"
              min={1}
              defaultValue={40}
              placeholder="Ex : 45"
              className="pr-10"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              m²
            </span>
          </div>
        </FormField>
      </CardContent>
    </FormCard>
  );
}
