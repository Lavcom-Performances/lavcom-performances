import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
import { FormField } from "./FormField";
import { OPENING_HOURS_PRESETS } from "@/config/simulatorFormOptions";

export function OpeningHoursCard() {
  return (
    <FormField label="Horaires d'ouverture envisagés" htmlFor="hours" icon={Clock} required>
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
  );
}
