import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/simulator/mockData";

export function LocalConstraintsForm() {
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
          defaultValue="rectangular"
          name="shape"
        />

        <RadioCard
          icon={Construction}
          title="Obstacles structurels"
          description="Poteaux, gaines techniques ou murs porteurs impactant l'espace utilisable"
          options={STRUCTURAL_OBSTACLES}
          defaultValue="none"
          name="obstacles"
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
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
                <Input id="door-width" type="number" defaultValue={90} />
              </FormField>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Façade modifiable ?</Label>
                <RadioGroup defaultValue="unknown" className="space-y-2">
                  {FACADE_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      className="flex items-center gap-3 rounded-lg border p-2 transition hover:bg-muted/40"
                    >
                      <RadioGroupItem value={opt.value} id={`facade-${opt.value}`} />
                      <Label htmlFor={`facade-${opt.value}`} className="flex-1 cursor-pointer text-sm">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <RadioCard
            icon={Wrench}
            title="Contraintes techniques"
            description="État des raccordements (eau, électricité, évacuation, ventilation)"
            options={TECHNICAL_CONSTRAINTS}
            defaultValue="check_with_installer"
            name="tech"
          />
        </div>
      </div>
    </div>
  );
}
