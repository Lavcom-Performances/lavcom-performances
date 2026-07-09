import { FormCard, CardContent, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ruler } from "lucide-react";
import { SURFACE_PRESETS } from "@/config/simulatorFormOptions";

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
        <Select defaultValue="40">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SURFACE_PRESETS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </FormCard>
  );
}
