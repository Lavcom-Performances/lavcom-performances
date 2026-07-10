import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
import { FormField } from "./FormField";
import { OPENING_HOURS_OPTIONS } from "@/config/simulatorFormOptions";

export function OpeningHoursCard() {
  return (
    <FormField label="Horaires d'ouverture envisagés" htmlFor="hours" icon={Clock} required>
      <Select>
        <SelectTrigger id="hours">
          <SelectValue placeholder="Sélectionnez un horaire"/>
        </SelectTrigger>
        <SelectContent>
          {OPENING_HOURS_OPTIONS.map((h) => (
            <SelectItem key={h.value} value={h.value}>
              {h.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
