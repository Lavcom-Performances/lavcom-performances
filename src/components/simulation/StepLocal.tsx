import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Building2, 
  DoorOpen, 
  Construction, 
  Wrench,
  LayoutGrid
} from "lucide-react";
import { 
  SimulationProject, 
  LOCAL_SHAPE_OPTIONS,
  STRUCTURAL_OBSTACLES_OPTIONS,
  FACADE_MODIFIABLE_OPTIONS,
  TECHNICAL_CONSTRAINTS_OPTIONS,
  LocalShape,
  StructuralObstacles,
  FacadeModifiable,
  TechnicalConstraintsLevel
} from "@/types/simulation";

interface StepLocalProps {
  project: SimulationProject;
  onUpdate: (updates: Partial<SimulationProject>) => void;
}

export function StepLocal({ project, onUpdate }: StepLocalProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Votre local</h2>
        <p className="text-muted-foreground mt-2">
          Décrivez la configuration et les contraintes de votre futur emplacement
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Forme du local
          </CardTitle>
          <CardDescription>
            La forme du local influence l'agencement optimal des machines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={project.local_shape || 'rectangular'}
            onValueChange={(value) => onUpdate({ local_shape: value as LocalShape })}
            className="space-y-3"
          >
            {LOCAL_SHAPE_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={option.value} id={`shape-${option.value}`} />
                <Label htmlFor={`shape-${option.value}`} className="flex-1 cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-primary" />
            Obstacles structurels
          </CardTitle>
          <CardDescription>
            Poteaux, gaines techniques ou murs porteurs impactant l'espace utilisable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={project.has_structural_obstacles || 'none'}
            onValueChange={(value) => onUpdate({ has_structural_obstacles: value as StructuralObstacles })}
            className="space-y-3"
          >
            {STRUCTURAL_OBSTACLES_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={option.value} id={`obstacles-${option.value}`} />
                <Label htmlFor={`obstacles-${option.value}`} className="flex-1 cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
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
            <div className="space-y-2">
              <Label htmlFor="door_width">Largeur de la porte (cm)</Label>
              <Input
                id="door_width"
                type="number"
                min="50"
                max="300"
                placeholder="Ex: 90"
                value={project.door_width_cm || ''}
                onChange={(e) => onUpdate({ door_width_cm: parseInt(e.target.value) || undefined })}
              />
              <p className="text-xs text-muted-foreground">
                Une largeur inférieure à 90 cm peut compliquer l'installation de gros équipements
              </p>
            </div>

            <div className="space-y-3">
              <Label>Façade modifiable ?</Label>
              <RadioGroup
                value={project.can_modify_facade || 'unknown'}
                onValueChange={(value) => onUpdate({ can_modify_facade: value as FacadeModifiable })}
                className="space-y-2"
              >
                {FACADE_MODIFIABLE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={option.value} id={`facade-${option.value}`} />
                    <Label htmlFor={`facade-${option.value}`} className="flex-1 cursor-pointer text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Contraintes techniques
            </CardTitle>
            <CardDescription>
              État des raccordements (eau, électricité, évacuation, ventilation)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={project.technical_constraints_level || 'check_with_installer'}
              onValueChange={(value) => onUpdate({ technical_constraints_level: value as TechnicalConstraintsLevel })}
              className="space-y-3"
            >
              {TECHNICAL_CONSTRAINTS_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={option.value} id={`tech-${option.value}`} />
                  <Label htmlFor={`tech-${option.value}`} className="flex-1 cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
