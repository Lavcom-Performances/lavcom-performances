import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectGroup, SelectValue } from "@/components/ui/select";
import { MapPin, Mailbox, Map, Globe, Home } from "lucide-react";
import { FormField } from "./FormField";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { ZONE_TYPES, COUNTRIES } from "@/config/simulatorFormOptions";
import type { AddressSearchResult } from "@/hooks/useAddressSearch";
import type { SimulatorProjectFormProps } from "@/types/simulator.types";
import { defaultSimulationProject } from "@/hooks/useSimulatorProject";
import { CountryValue } from "@/types/simulatorFormOptions.types";

export function LocationCard({ project, onUpdate }: SimulatorProjectFormProps) {
  const projectCountry = COUNTRIES.find(
    (country) => country.label === (project.country || defaultSimulationProject.country)
  );

  const getCountryLabel = (countryValue: CountryValue): string => COUNTRIES.find(
    (country) => country.value === countryValue 
  ).label;

  const handleCountryChange = (value: CountryValue) => {
    onUpdate({
      country: getCountryLabel(value),
      address: "",
      city: "",
      postalCode: "",
      departmentCode: "",
      departmentName: "",
      region: "",
    });
  };

  const handleAddressSelect = (selectedAddress: AddressSearchResult) => {
    onUpdate({
      address: selectedAddress.address,
      city: selectedAddress.city,
      postalCode: selectedAddress.postalCode,
      departmentCode: selectedAddress.departmentCode ?? "",
      departmentName: selectedAddress.departmentName ?? "",
      region: selectedAddress.region ?? "",
    });
  };

  const handleAddressInputChange = (value: string) => {
    onUpdate({
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
        <Select value={projectCountry.value} onValueChange={(value) => handleCountryChange(value as CountryValue)}>
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
          value={project.address ?? defaultSimulationProject.address}
          country={projectCountry.code}
          onSelect={handleAddressSelect}
          onInputChange={handleAddressInputChange}
        />
      </FormField>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Ville" htmlFor="city" icon={MapPin} required hint="Rempli automatiquement">
          <Input
            id="city"
            value={project.city ?? defaultSimulationProject.city}
            readOnly
            placeholder="Ex. : Paris"
            className="bg-white shadow-form opacity-70"
          />
        </FormField>
        <FormField label="Code postal" htmlFor="zip" icon={Mailbox} required hint="Rempli automatiquement">
          <Input
            id="zip"
            value={project.postalCode ?? defaultSimulationProject.postalCode}
            readOnly
            placeholder="Ex. : 75004"
            className="bg-white shadow-form opacity-70"
          />
        </FormField>
      </div>

      <FormField label="Type de zone" htmlFor="zone" icon={Map} required>
        <Select
          value={project.zoneType ?? defaultSimulationProject.zoneType}
          onValueChange={(value) => onUpdate({ zoneType: value })}
        >
          <SelectTrigger id="zone" className="bg-white shadow-form">
            <SelectValue placeholder="Sélectionnez un type de zone" />
          </SelectTrigger>
          <SelectContent>
            {ZONE_TYPES.map((zoneType) => (
              <SelectItem key={zoneType.value} value={zoneType.value}>
                {zoneType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
}
