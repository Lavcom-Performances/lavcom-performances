import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Maximize, Clock, Map } from "lucide-react";
import { SimulationProject } from "@/types/simulation";
import { CityAutocomplete } from "./CityAutocomplete";
import { formatUserInput } from "@/lib/textUtils";
import { 
  SURFACE_OPTIONS, 
  OPENING_HOURS_OPTIONS, 
  ZONE_TYPES,
  CitySearchResult 
} from "@/hooks/useCitySearch";

interface StepProjectInfoProps {
  project: SimulationProject;
  onUpdate: (updates: Partial<SimulationProject>) => void;
}

export function StepProjectInfo({ project, onUpdate }: StepProjectInfoProps) {
  const [showCustomSurface, setShowCustomSurface] = useState(false);
  const [showCustomHours, setShowCustomHours] = useState(false);

  const handleCitySelect = (result: CitySearchResult) => {
    onUpdate({ 
      city: result.city,
      postal_code: result.postalCode,
      department: result.department,
      location: `${result.city} (${result.postalCode})`
    });
  };

  const handleSurfaceChange = (value: string) => {
    if (value === "custom") {
      setShowCustomSurface(true);
    } else {
      setShowCustomSurface(false);
      onUpdate({ surface_m2: parseFloat(value) });
    }
  };

  const handleHoursChange = (value: string) => {
    if (value === "custom") {
      setShowCustomHours(true);
      onUpdate({ opening_hours_description: "" });
    } else {
      setShowCustomHours(false);
      onUpdate({ opening_hours_description: value });
    }
  };

  const getCurrentSurfaceValue = () => {
    const match = SURFACE_OPTIONS.find(opt => opt.value === String(project.surface_m2));
    if (match) return match.value;
    if (project.surface_m2 > 0 && !match) return "custom";
    return "";
  };

  const getCurrentHoursValue = () => {
    const match = OPENING_HOURS_OPTIONS.find(opt => opt.value === project.opening_hours_description);
    if (match) return match.value;
    if (project.opening_hours_description && !match) return "custom";
    return "";
  };

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
          {/* Nom du projet */}
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
              onBlur={(e) => onUpdate({ name: formatUserInput(e.target.value) })}
            />
          </div>

          {/* Localisation avec autocomplétion */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ville
              </Label>
              <CityAutocomplete
                value={project.location || ""}
                onSelect={handleCitySelect}
                placeholder="Rechercher une ville..."
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Type de zone
              </Label>
              <Select
                value={project.zone_type || ""}
                onValueChange={(value) => onUpdate({ zone_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type de zone" />
                </SelectTrigger>
                <SelectContent>
                  {ZONE_TYPES.map((zone) => (
                    <SelectItem key={zone.value} value={zone.value}>
                      {zone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Surface */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Maximize className="h-4 w-4" />
              Surface du local
            </Label>
            <div className="flex gap-3">
              <Select
                value={getCurrentSurfaceValue()}
                onValueChange={handleSurfaceChange}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sélectionner une surface" />
                </SelectTrigger>
                <SelectContent>
                  {SURFACE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showCustomSurface && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="10"
                    max="500"
                    placeholder="m²"
                    value={project.surface_m2 || ''}
                    onChange={(e) => onUpdate({ surface_m2: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">m²</span>
                </div>
              )}
            </div>
          </div>

          {/* Horaires d'ouverture */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horaires d'ouverture envisagés
            </Label>
            <div className="flex flex-col gap-3">
              <Select
                value={getCurrentHoursValue()}
                onValueChange={handleHoursChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner des horaires" />
                </SelectTrigger>
                <SelectContent>
                  {OPENING_HOURS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showCustomHours && (
                <Input
                  placeholder="Ex: Lun-Sam 7h-22h, Dim 8h-20h"
                  value={project.opening_hours_description}
                  onChange={(e) => onUpdate({ opening_hours_description: e.target.value })}
                  onBlur={(e) => onUpdate({ opening_hours_description: formatUserInput(e.target.value) })}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
