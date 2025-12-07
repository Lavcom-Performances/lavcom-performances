import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Maximize, Clock } from "lucide-react";
import { SimulationProject } from "@/types/simulation";

interface StepProjectInfoProps {
  project: SimulationProject;
  onUpdate: (updates: Partial<SimulationProject>) => void;
}

export function StepProjectInfo({ project, onUpdate }: StepProjectInfoProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Informations sur votre projet</h2>
        <p className="text-muted-foreground mt-2">
          Décrivez les caractéristiques principales de votre future laverie
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Détails du projet
          </CardTitle>
          <CardDescription>
            Ces informations nous aideront à personnaliser votre simulation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Nom du projet
              </Label>
              <Input
                id="name"
                placeholder="Ex: Laverie Centre-ville Lyon"
                value={project.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ville / Zone
              </Label>
              <Input
                id="location"
                placeholder="Ex: Lyon 2ème arrondissement"
                value={project.location}
                onChange={(e) => onUpdate({ location: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="surface" className="flex items-center gap-2">
              <Maximize className="h-4 w-4" />
              Surface du local (m²)
            </Label>
            <Input
              id="surface"
              type="number"
              min="0"
              placeholder="Ex: 50"
              value={project.surface_m2 || ''}
              onChange={(e) => onUpdate({ surface_m2: parseFloat(e.target.value) || 0 })}
              className="max-w-[200px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horaires d'ouverture envisagés
            </Label>
            <Textarea
              id="hours"
              placeholder="Ex: 7h - 22h tous les jours, 24h/24 avec accès badge..."
              value={project.opening_hours_description}
              onChange={(e) => onUpdate({ opening_hours_description: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
