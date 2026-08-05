import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Construction, DoorOpen, LayoutGrid, Wrench } from "lucide-react";
import { TabSectionHeading } from "./TabSectionHeading";
import { FormField } from "./FormField";
import { RadioCard } from "./RadioCard";
import { SurfaceCard } from "./SurfaceCard";
import {
  FACADE_OPTIONS,
  LOCAL_SHAPES,
  STRUCTURAL_OBSTACLES,
  TECHNICAL_CONSTRAINTS,
} from "@/config/simulatorFormOptions";
import type {
  LocalShapeValue,
  StructuralObstacleValue,
  FacadeOptionValue,
  TechnicalConstraintValue,
} from "@/types/simulatorFormOptions.types";
import { defaultSimulationProject } from "@/hooks/useSimulatorProject";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { useSimulatorStepErrors } from "@/contexts/SimulatorStepContext";
import { useTranslation } from "react-i18next";

export function LocalConstraintsForm() {
  const { t } = useTranslation("paid-simulator");
  const { project, updateProject } = useSimulatorProjectContext();
  const { fieldError } = useSimulatorStepErrors();
  return (
    <div className="space-y-8">
      <TabSectionHeading
        title={t("project.local.sectionTitle")}
        description={t("project.local.sectionDescription")}
      />

      <div className="space-y-6">
        <SurfaceCard />

        <RadioCard
          icon={LayoutGrid}
          title={t("project.local.shapeTitle")}
          description={t("project.local.shapeDescription")}
          options={LOCAL_SHAPES}
          optionKeyPrefix="options.localShapes"
          value={project.localShape ?? defaultSimulationProject.localShape}
          onValueChange={(value) => updateProject({ localShape: value as LocalShapeValue })}
          name="shape"
          required={false}
        />

        <RadioCard
          icon={Construction}
          title={t("project.local.obstaclesTitle")}
          description={t("project.local.obstaclesDescription")}
          options={STRUCTURAL_OBSTACLES}
          optionKeyPrefix="options.structuralObstacles"
          value={project.structuralObstacles ?? defaultSimulationProject.structuralObstacles}
          onValueChange={(value) => updateProject({ structuralObstacles: value as StructuralObstacleValue })}
          name="obstacles"
          required={false}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormCard className="">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-primary" />
                {t("project.local.accessTitle")}
              </CardTitle>
              <CardDescription>
                {t("project.local.accessDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                label={t("project.local.doorWidthLabel")}
                htmlFor="door-width"
                hint={t("project.local.doorWidthHint")}
                error={fieldError("doorWidth")}
              >
                <Input
                  id="door-width"
                  type="number"
                  value={project.doorWidth ?? defaultSimulationProject.doorWidth}
                  onChange={(e) => updateProject({ doorWidth: Number(e.target.value) })}
                  className="bg-white shadow-form"
                />
              </FormField>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("project.local.facadeLabel")}</Label>
                <RadioGroup
                  value={project.canModifyFacade ?? defaultSimulationProject.canModifyFacade}
                  onValueChange={(value) => updateProject({ canModifyFacade: value as FacadeOptionValue })}
                  className="space-y-2"
                >
                  {FACADE_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center gap-3 rounded-lg border p-2 transition hover:bg-muted/40 shadow-form"
                    >
                      <RadioGroupItem value={option.value} id={`facade-${option.value}`} />
                      <Label htmlFor={`facade-${option.value}`} className="flex-1 cursor-pointer text-sm">
                        {t(`options.facade.${option.value}`)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </FormCard>

          <RadioCard
            icon={Wrench}
            title={t("project.local.technicalTitle")}
            description={t("project.local.technicalDescription")}
            options={TECHNICAL_CONSTRAINTS}
            optionKeyPrefix="options.technicalConstraints"
            value={project.technicalConstraints ?? defaultSimulationProject.technicalConstraints}
            onValueChange={(value) => updateProject({ technicalConstraints: value as TechnicalConstraintValue })}
            name="tech"
            required={false}
          />
        </div>
      </div>
    </div>
  );
}
