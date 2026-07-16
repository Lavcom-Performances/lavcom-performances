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

export function LocalConstraintsForm() {
  const { project, updateProject } = useSimulatorProjectContext();
  return (
    <div className="space-y-8">
      <TabSectionHeading
        title="Votre local"
        description="Décrivez la configuration et les contraintes de votre futur emplacement"
      />

      <div className="space-y-6">
        <SurfaceCard />

        <RadioCard
          icon={LayoutGrid}
          title="Forme du local"
          description="La forme du local influence l'agencement optimal des machines"
          options={LOCAL_SHAPES}
          value={project.localShape ?? defaultSimulationProject.localShape}
          onValueChange={(value) => updateProject({ localShape: value as LocalShapeValue })}
          name="shape"
          required={false}
        />

        <RadioCard
          icon={Construction}
          title="Obstacles structurels"
          description="Poteaux, gaines techniques ou murs porteurs impactant l'espace utilisable"
          options={STRUCTURAL_OBSTACLES}
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
                Accès au local
              </CardTitle>
              <CardDescription>
                Largeur de la porte principale pour le passage des machines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                label="Largeur de la porte (cm)"
                htmlFor="door-width"
                hint="Une largeur inférieure à 90 cm peut compliquer l'installation de gros équipements"
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
                <Label className="text-sm font-medium">Façade modifiable ?</Label>
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
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </FormCard>

          <RadioCard
            icon={Wrench}
            title="Contraintes techniques"
            description="État des raccordements (eau, électricité, évacuation, ventilation)"
            options={TECHNICAL_CONSTRAINTS}
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
