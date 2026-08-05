import { FormCard, CardContent, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Input } from "@/components/ui/input";
import { Ruler } from "lucide-react";
import { FormField } from "./FormField";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { useSimulatorStepErrors } from "@/contexts/SimulatorStepContext";
import { useTranslation } from "react-i18next";

function getSurfaceHintKey(num: number): string | undefined {
  if (Number.isNaN(num) || num <= 0) return undefined;
  if (num < 20) return "project.surfaceHint.tooSmall";
  if (num < 30) return "project.surfaceHint.micro";
  if (num < 40) return "project.surfaceHint.small";
  if (num < 50) return "project.surfaceHint.standard";
  if (num < 60) return "project.surfaceHint.medium";
  if (num < 80) return "project.surfaceHint.large";
  if (num < 100) return "project.surfaceHint.veryLarge";
  return "project.surfaceHint.xxl";
}

export function SurfaceCard() {
  const { t } = useTranslation("paid-simulator");
  const { project, updateProject } = useSimulatorProjectContext();
  const { fieldError } = useSimulatorStepErrors();
  const surface = project.surface ?? 0;
  const hintKey = getSurfaceHintKey(surface);
  const hint = hintKey ? t(hintKey, { surface }) : undefined;

  return (
    <FormCard className="">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-5 w-5 text-primary" />
          {t("project.local.surfaceCardTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FormField label={t("project.local.surfaceLabel")} htmlFor="surface" required hint={hint} error={fieldError("surface")}>
          <div className="flex items-center gap-2">
            <Input
              id="surface"
              type="number"
              min={0}
              max={500}
              placeholder={t("project.local.surfacePlaceholder")}
              value={surface || ""}
              onChange={(e) => updateProject({ surface: Number(e.target.value) })}
              className="bg-white shadow-form md:w-1/2"
              required
            />
            <span className="text-sm text-muted-foreground shrink-0">{t("common.squareMeters")}</span>
          </div>
        </FormField>
      </CardContent>
    </FormCard>
  );
}
