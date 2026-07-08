import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
import { FormField } from "./FormField";
import { OPENING_HOURS_PRESETS, SURFACE_PRESETS } from "@/components/simulator/mockData";

export function SurfaceHoursCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Surface & horaires
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <FormField label="Surface du local" htmlFor="surface">
          <Select defaultValue="40">
            <SelectTrigger id="surface">
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
        </FormField>
        <FormField label="Horaires d'ouverture envisagés" htmlFor="hours">
          <Select defaultValue="7-22">
            <SelectTrigger id="hours">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPENING_HOURS_PRESETS.map((h) => (
                <SelectItem key={h.value} value={h.value}>
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </CardContent>
    </Card>
  );
}
