import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectGroup, SelectValue } from "@/components/ui/select";
import { MapPin, Mailbox, Map, Globe, Home } from "lucide-react";
import { FormField } from "./FormField";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { ZONE_TYPES, COUNTRIES } from "@/config/simulatorFormOptions";
import type { AddressSearchResult } from "@/hooks/useAddressSearch";
import type { ProjectLocationState } from "./ProjectInfoForm";

interface Props {
  projectLocation: ProjectLocationState;
  onProjectLocationChange: (next: ProjectLocationState) => void;
}

export function LocationCard({ projectLocation, onProjectLocationChange }: Props) {
  // Changement de pays -> on conserve le pays, on reset les champs géo dépendants
  // pour éviter d'afficher une ville/CP incohérents avec le nouveau pays.
  const handleCountryChange = (value: string) => {
    onProjectLocationChange({
      ...projectLocation,
      // Les valeurs de COUNTRIES sont en minuscule ("fr"), on stocke en ISO majuscule
      // pour matcher l'attente du hook (BAN pour "FR", Nominatim sinon).
      country: value.toUpperCase(),
      address: "",
      city: "",
      postalCode: "",
      departmentCode: "",
      departmentName: "",
      region: "",
    });
  };

  // Sélection d'une suggestion complète : on remplit tous les champs dérivés.
  const handleAddressSelect = (r: AddressSearchResult) => {
    onProjectLocationChange({
      ...projectLocation,
      address: r.address,
      city: r.city,
      postalCode: r.postalCode,
      departmentCode: r.departmentCode ?? "",
      departmentName: r.departmentName ?? "",
      region: r.region ?? "",
    });
  };

  // Frappe libre : on met à jour uniquement `address` et on invalide
  // les champs auto-remplis tant que rien n'est sélectionné.
  const handleAddressInputChange = (value: string) => {
    onProjectLocationChange({
      ...projectLocation,
      address: value,
      city: "",
      postalCode: "",
      departmentCode: "",
      departmentName: "",
      region: "",
    });
  };

  return (
    <div className="space-y-6">
      <FormField label="Pays" htmlFor="country" icon={Globe} required>
        <Select
          value={projectLocation.country.toLowerCase()}
          onValueChange={handleCountryChange}
        >
          <SelectTrigger id="country" className="bg-white shadow-form">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.value}>
                  <span className="mr-2">{country.flag}</span>
                  {country.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Adresse du local"
        htmlFor="address"
        icon={Home}
        required
        hint="💡 Sélectionnez une adresse dans la liste pour remplir automatiquement la ville et le code postal"
      >
        <AddressAutocomplete
          id="address"
          value={projectLocation.address}
          country={projectLocation.country}
          onSelect={handleAddressSelect}
          onInputChange={handleAddressInputChange}
        />
      </FormField>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Ville" htmlFor="city" icon={MapPin} required hint="Rempli automatiquement">
          <Input
            id="city"
            value={projectLocation.city}
            readOnly
            placeholder="Ex. : Paris"
            className="bg-white shadow-form opacity-70"
          />
        </FormField>
        <FormField label="Code postal" htmlFor="zip" icon={Mailbox} required hint="Rempli automatiquement">
          <Input
            id="zip"
            value={projectLocation.postalCode}
            readOnly
            placeholder="Ex. : 75004"
            className="bg-white shadow-form opacity-70"
          />
        </FormField>
      </div>

      <FormField label="Type de zone" htmlFor="zone" icon={Map} required>
        <Select>
          <SelectTrigger id="zone" className="bg-white shadow-form">
            <SelectValue placeholder="Sélectionnez un type de zone" />
          </SelectTrigger>
          <SelectContent>
            {ZONE_TYPES.map((z) => (
              <SelectItem key={z.value} value={z.value}>
                {z.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
}
