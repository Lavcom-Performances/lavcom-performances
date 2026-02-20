import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, Maximize, Clock, Map, Globe, AlertCircle, Home } from "lucide-react";
import { SimulationProject } from "@/types/simulation";
import { CityAutocomplete } from "./CityAutocomplete";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { formatUserInput } from "@/lib/textUtils";
import { 
  SURFACE_OPTIONS, 
  OPENING_HOURS_OPTIONS, 
  ZONE_TYPES,
  COUNTRIES,
  CitySearchResult 
} from "@/hooks/useCitySearch";
import { ValidationErrors } from "@/hooks/useSimulationValidation";
import { cn } from "@/lib/utils";

interface StepProjectInfoProps {
  project: SimulationProject;
  onUpdate: (updates: Partial<SimulationProject>) => void;
  errors?: ValidationErrors;
  showErrors?: boolean;
}

export function StepProjectInfo({ project, onUpdate, errors = {}, showErrors = false }: StepProjectInfoProps) {
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

  const handleAddressSelect = (result: { address: string; city: string; postalCode: string; department: string }) => {
    console.log('Address selected:', result);
    // Ensure all fields are properly updated
    const updates: Partial<SimulationProject> = {
      address: result.address,
      city: result.city,
      postal_code: result.postalCode,
      department: result.department,
      location: `${result.address}, ${result.city} (${result.postalCode})`
    };
    console.log('Updating project with:', updates);
    onUpdate(updates);
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
            <Label htmlFor="name" className={cn("flex items-center gap-2", showErrors && errors.name && "text-destructive")}>
              <Building2 className="h-4 w-4" />
              Nom du projet <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Ex: Laverie Centre-ville Lyon"
              value={project.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              onBlur={(e) => onUpdate({ name: formatUserInput(e.target.value) })}
              className={cn(showErrors && errors.name && "border-destructive focus-visible:ring-destructive")}
            />
            {showErrors && errors.name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Pays */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Pays
            </Label>
            <Select
              value={project.country || "FR"}
              onValueChange={(value) => onUpdate({ country: value, location: '', city: '', postal_code: '', department: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un pays" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    <span className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{country.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Adresse avec autocomplétion (France uniquement) */}
          {(project.country === "FR" || !project.country) && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Adresse du local
              </Label>
              <AddressAutocomplete
                value={project.address || ""}
                onSelect={handleAddressSelect}
                placeholder="Tapez et sélectionnez une adresse..."
              />
              <p className="text-xs text-muted-foreground">
                💡 Sélectionnez une adresse dans la liste pour remplir automatiquement la ville et le code postal
              </p>
            </div>
          )}

          {/* Localisation avec autocomplétion */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className={cn("flex items-center gap-2", showErrors && errors.city && "text-destructive")}>
                <MapPin className="h-4 w-4" />
                Ville <span className="text-destructive">*</span>
              </Label>
              <CityAutocomplete
                value={project.city || ""}
                onSelect={handleCitySelect}
                placeholder="Rechercher une ville..."
                country={project.country || "FR"}
                hasError={showErrors && !!errors.city}
              />
              {showErrors && errors.city && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.city}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Code postal
              </Label>
              <Input
                value={project.postal_code || ""}
                placeholder="Ex: 75001"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Rempli automatiquement</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className={cn("flex items-center gap-2", showErrors && errors.zone_type && "text-destructive")}>
                <Map className="h-4 w-4" />
                Type de zone <span className="text-destructive">*</span>
              </Label>
              <Select
                value={project.zone_type || ""}
                onValueChange={(value) => onUpdate({ zone_type: value })}
              >
                <SelectTrigger className={cn(showErrors && errors.zone_type && "border-destructive focus:ring-destructive")}>
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
              {showErrors && errors.zone_type && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.zone_type}
                </p>
              )}
            </div>

            {project.department && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  Département
                </Label>
                <Input
                  value={project.department}
                  disabled
                  className="bg-muted"
                />
              </div>
            )}
          </div>

          {/* Surface */}
          <div className="space-y-2">
            <Label className={cn("flex items-center gap-2", showErrors && errors.surface_m2 && "text-destructive")}>
              <Maximize className="h-4 w-4" />
              Surface du local <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-3">
              <Select
                value={getCurrentSurfaceValue()}
                onValueChange={handleSurfaceChange}
              >
                <SelectTrigger className={cn("flex-1", showErrors && errors.surface_m2 && "border-destructive focus:ring-destructive")}>
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
                    className={cn("w-24", showErrors && errors.surface_m2 && "border-destructive focus-visible:ring-destructive")}
                  />
                  <span className="text-muted-foreground">m²</span>
                </div>
              )}
            </div>
            {showErrors && errors.surface_m2 && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.surface_m2}
              </p>
            )}
          </div>

          {/* Horaires d'ouverture */}
          <div className="space-y-2">
            <Label className={cn("flex items-center gap-2", showErrors && errors.opening_hours_description && "text-destructive")}>
              <Clock className="h-4 w-4" />
              Horaires d'ouverture envisagés <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-col gap-3">
              <Select
                value={getCurrentHoursValue()}
                onValueChange={handleHoursChange}
              >
                <SelectTrigger className={cn(showErrors && errors.opening_hours_description && "border-destructive focus:ring-destructive")}>
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
                  className={cn(showErrors && errors.opening_hours_description && "border-destructive focus-visible:ring-destructive")}
                />
              )}
            </div>
            {showErrors && errors.opening_hours_description && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.opening_hours_description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
