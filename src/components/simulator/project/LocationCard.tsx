import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectGroup, SelectValue } from "@/components/ui/select";
import { MapPin, Mailbox, Map, Globe, Home } from "lucide-react";
import { FormField } from "./FormField";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { ZONE_TYPES, COUNTRIES } from "@/config/simulatorFormOptions";
import type { AddressSearchResult } from "@/hooks/useAddressSearch";
import type { SimulatorProjectFormProps } from "./types";

export function LocationCard({ project, onUpdate }: SimulatorProjectFormProps) {
  const country = (project.country ?? "fr").toString();

  const handleCountryChange = (value: string) => {
    onUpdate({
      country: value,
      address: "",
      city: "",
      postalCode: "",
      departmentCode: "",
      departmentName: "",
      region: "",
    });
  };

  const handleAddressSelect = (r: AddressSearchResult) => {
    onUpdate({
      address: r.address,
      city: r.city,
      postalCode: r.postalCode,
      departmentCode: r.departmentCode ?? "",
      departmentName: r.departmentName ?? "",
      region: r.region ?? "",
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
        <Select value={country.toLowerCase()} onValueChange={handleCountryChange}>
          <SelectTrigger id="country" className="bg-white shadow-form">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.value}>
                  <span className="mr-2">{c.flag}</span>
                  {c.label}
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
          value={project.address ?? ""}
          country={country.toUpperCase()}
          onSelect={handleAddressSelect}
          onInputChange={handleAddressInputChange}
        />
      </FormField>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Ville" htmlFor="city" icon={MapPin} required hint="Rempli automatiquement">
          <Input
            id="city"
            value={project.city ?? ""}
            readOnly
            placeholder="Ex. : Paris"
            className="bg-white shadow-form opacity-70"
          />
        </FormField>
        <FormField label="Code postal" htmlFor="zip" icon={Mailbox} required hint="Rempli automatiquement">
          <Input
            id="zip"
            value={project.postalCode ?? ""}
            readOnly
            placeholder="Ex. : 75004"
            className="bg-white shadow-form opacity-70"
          />
        </FormField>
      </div>

      <FormField label="Type de zone" htmlFor="zone" icon={Map} required>
        <Select value={project.zoneType ?? ""} onValueChange={(v) => onUpdate({ zoneType: v })}>
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
