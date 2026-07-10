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
          <Input
            id="surface"
            type="number"
            min={1}
            defaultValue={40}
            placeholder="Ex : 45 m²"
          />
        </FormField>
      </CardContent>
    </FormCard>
  );
}
