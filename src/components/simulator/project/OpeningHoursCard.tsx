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
} from "@/config/simulatorFormOptions";
import { defaultSimulationProject } from "@/hooks/useSimulatorProject";
import type { OpeningHoursValue, OpeningDaysValue, OpeningHoursOption, OpeningDaysOption, WeekDay } from "@/types/simulatorFormOptions.types";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { useSimulatorStepErrors } from "@/contexts/SimulatorStepContext";
import { useTranslation } from "react-i18next";

export function OpeningHoursCard() {
  const { t } = useTranslation("paid-simulator");
  const { project, updateProject: onUpdate } = useSimulatorProjectContext();
  const { fieldError } = useSimulatorStepErrors();
  const getPresetHoursOption = (value: OpeningHoursValue): OpeningHoursOption => OPENING_HOURS_OPTIONS.find((option) => option.value === value)
  const getPresetDaysOption = (value: OpeningDaysValue): OpeningDaysOption => OPENING_DAYS_OPTIONS.find((option) => option.value === value)
  
  const openingHours = project.openingHours ?? defaultSimulationProject.openingHours;
  const openingDays = project.openingDays ?? defaultSimulationProject.openingDays;
  const openingHoursValue = (openingHours.value as OpeningHoursValue | undefined) ?? "";
  const openingDaysValue = (openingDays.value as OpeningDaysValue | undefined) ?? "";
  const [customOpenAt, setCustomOpenAt] = useState(openingHours.value === "custom" ? openingHours.openAt : getPresetHoursOption("custom").openAt);
  const [customCloseAt, setcustomCloseAt] = useState(openingHours.value === "custom" ? openingHours.closeAt : getPresetHoursOption("custom").closeAt);
  const [customDays, setCustomDays] = useState(openingDays.value === "custom" ? openingDays.days : getPresetDaysOption("custom").days);

  const setHoursPreset = (value: OpeningHoursValue) => {
    const preset = getPresetHoursOption(value);
    if (value === "custom") {
      onUpdate({ openingHours: { value: value, openAt: customOpenAt, closeAt: customCloseAt } });
    } else if (preset) {
      onUpdate({ openingHours: { value: preset.value, openAt: preset.openAt, closeAt: preset.closeAt } });
    }
  };

  const setDaysPreset = (value: OpeningDaysValue) => {
    const preset = getPresetDaysOption(value);
    if (value === "custom") {
      onUpdate({ openingDays: { value: value, days: customDays } });
    } else if (preset) {
      onUpdate({ openingDays: { value: preset.value, days: preset.days } });
    }
  };

  const updateCustomHour = (which: "openAt" | "closeAt", value: string) => {
    switch (which) {
      case "openAt":
        setCustomOpenAt(value);
        break;
      case "closeAt":
        setcustomCloseAt(value);
    }
    onUpdate({
      openingHours: {
        value: "custom",
        openAt: which === "openAt" ? value : customOpenAt,
        closeAt: which === "closeAt" ? value : customCloseAt,
      },
    });
  };

  const toggleDay = (day: WeekDay, checked: boolean) => {
    const newDays = checked
      ? [...customDays, day]
      : customDays.filter(custDay => custDay !== day);
    
    setCustomDays(newDays);
    onUpdate({ openingDays: { value: "custom", days: newDays } });
  };

  return (
    <div className="space-y-6">
      <FormField label={t("project.openingHours.hoursLabel")} htmlFor="hours" icon={Clock} required error={fieldError("openingHours")}>
        <Select value={openingHoursValue} onValueChange={(value) => setHoursPreset(value as OpeningHoursValue)}>
          <SelectTrigger id="hours" className="bg-white shadow-form">
            <SelectValue placeholder={t("project.openingHours.hoursPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {OPENING_HOURS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(`options.openingHours.${option.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {openingHoursValue === "custom" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-open-at" className="text-sm">{t("project.openingHours.customOpenAt")}</Label>
              <Input
                id="custom-open-at"
                type="time"
                value={customOpenAt}
                onChange={(e) => updateCustomHour("openAt", e.target.value)}
                className="bg-white shadow-form"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-close-at" className="text-sm">{t("project.openingHours.customCloseAt")}</Label>
              <Input
                id="custom-close-at"
                type="time"
                value={customCloseAt}
                onChange={(e) => updateCustomHour("closeAt", e.target.value)}
                className="bg-white shadow-form"
              />
            </div>
          </div>
        )}
      </FormField>

      <FormField label={t("project.openingHours.daysLabel")} htmlFor="days" icon={CalendarDays} required error={fieldError("openingDays")}>
        <Select value={openingDaysValue} onValueChange={(value) => setDaysPreset(value as OpeningDaysValue)}>
          <SelectTrigger id="days" className="bg-white shadow-form">
            <SelectValue placeholder={t("project.openingHours.daysPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {OPENING_DAYS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(`options.openingDays.${option.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {openingDaysValue === "custom" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => {
              const checked = customDays.find((custDay) => custDay === day.value) ? true : false ;
              return (
                <label
                  key={day.value}
                  htmlFor={`day-${day.value}`}
                  className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm shadow-form cursor-pointer transition hover:bg-muted/40"
                >
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={checked}
                    onCheckedChange={(isChecked) => toggleDay(day.value, isChecked as boolean)}
                  />
                  <span>{t(`options.weekDays.${day.value}`)}</span>
                </label>
              );
            })}
          </div>
        )}
      </FormField>
    </div>
  );
}
