import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Clock, CalendarDays } from "lucide-react";
import { FormField } from "./FormField";
import {
  OPENING_HOURS_OPTIONS,
  OPENING_DAYS_OPTIONS,
  WEEK_DAYS,
  type WeekDayValue,
} from "@/config/simulatorFormOptions";
import type { OpeningHoursValue, OpeningDaysValue } from "@/types/simulatorFormOptions.types";

export function OpeningHoursCard() {
  const [hoursPreset, setHoursPreset] = useState<OpeningHoursValue | "">("");
  const [customOpenTime, setCustomOpenTime] = useState("07:00");
  const [customCloseTime, setCustomCloseTime] = useState("21:00");

  const [daysPreset, setDaysPreset] = useState<OpeningDaysValue | "">("");
  const [customDays, setCustomDays] = useState<Set<WeekDayValue>>(new Set());

  const toggleDay = (day: WeekDayValue, checked: boolean) => {
    setCustomDays((prev) => {
      const next = new Set(prev);
      if (checked) next.add(day);
      else next.delete(day);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <FormField label="Horaires d'ouverture envisagés" htmlFor="hours" icon={Clock} required>
        <Select value={hoursPreset} onValueChange={(v) => setHoursPreset(v as OpeningHoursValue)}>
          <SelectTrigger id="hours" className="bg-white shadow-form">
            <SelectValue placeholder="Sélectionnez un horaire" />
          </SelectTrigger>
          <SelectContent>
            {OPENING_HOURS_OPTIONS.map((h) => (
              <SelectItem key={h.value} value={h.value}>
                {h.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hoursPreset === "custom" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-open" className="text-sm">Horaire d'ouverture</Label>
              <Input
                id="custom-open"
                type="time"
                value={customOpenTime}
                onChange={(e) => setCustomOpenTime(e.target.value)}
                className="bg-white shadow-form"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-close" className="text-sm">Horaire de fermeture</Label>
              <Input
                id="custom-close"
                type="time"
                value={customCloseTime}
                onChange={(e) => setCustomCloseTime(e.target.value)}
                className="bg-white shadow-form"
              />
            </div>
          </div>
        )}
      </FormField>

      <FormField label="Jours d'ouverture envisagés" htmlFor="days" icon={CalendarDays} required>
        <Select value={daysPreset} onValueChange={(v) => setDaysPreset(v as OpeningDaysValue)}>
          <SelectTrigger id="days" className="bg-white shadow-form">
            <SelectValue placeholder="Sélectionnez les jours" />
          </SelectTrigger>
          <SelectContent>
            {OPENING_DAYS_OPTIONS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {daysPreset === "custom" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => {
              const checked = customDays.has(day.value);
              return (
                <label
                  key={day.value}
                  htmlFor={`day-${day.value}`}
                  className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm shadow-form cursor-pointer transition hover:bg-muted/40"
                >
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={checked}
                    onCheckedChange={(v) => toggleDay(day.value, v === true)}
                  />
                  <span>{day.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </FormField>
    </div>
  );
}
