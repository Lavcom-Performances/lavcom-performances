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
import type { SimulatorProjectFormProps } from "@/types/simulator.types";

export function OpeningHoursCard({ project, onUpdate }: SimulatorProjectFormProps) {
  const hours = project.openingHours ?? {};
  const days = project.openingDays ?? {};
  const hoursPreset = (hours.value as OpeningHoursValue | undefined) ?? "";
  const daysPreset = (days.value as OpeningDaysValue | undefined) ?? "";
  const customOpen = hours.openAt ?? "07:00";
  const customClose = hours.closeAt ?? "21:00";
  const customDays = new Set<WeekDayValue>((days.days ?? []) as WeekDayValue[]);

  const setHoursPreset = (v: OpeningHoursValue) => {
    const preset = OPENING_HOURS_OPTIONS.find((o) => o.value === v);
    if (v === "custom") {
      onUpdate({ openingHours: { value: v, openAt: customOpen, closeAt: customClose } });
    } else if (preset) {
      onUpdate({ openingHours: { value: preset.value, openAt: preset.openAt, closeAt: preset.closeAt } });
    }
  };

  const setDaysPreset = (v: OpeningDaysValue) => {
    const preset = OPENING_DAYS_OPTIONS.find((o) => o.value === v);
    if (v === "custom") {
      onUpdate({ openingDays: { value: v, days: Array.from(customDays) } });
    } else if (preset) {
      onUpdate({ openingDays: { value: preset.value, days: [...preset.days] } });
    }
  };

  const updateCustomHour = (which: "openAt" | "closeAt", value: string) => {
    onUpdate({
      openingHours: {
        value: "custom",
        openAt: which === "openAt" ? value : customOpen,
        closeAt: which === "closeAt" ? value : customClose,
      },
    });
  };

  const toggleDay = (day: WeekDayValue, checked: boolean) => {
    const next = new Set(customDays);
    if (checked) next.add(day);
    else next.delete(day);
    onUpdate({ openingDays: { value: "custom", days: Array.from(next) } });
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
                value={customOpen}
                onChange={(e) => updateCustomHour("openAt", e.target.value)}
                className="bg-white shadow-form"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-close" className="text-sm">Horaire de fermeture</Label>
              <Input
                id="custom-close"
                type="time"
                value={customClose}
                onChange={(e) => updateCustomHour("closeAt", e.target.value)}
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
