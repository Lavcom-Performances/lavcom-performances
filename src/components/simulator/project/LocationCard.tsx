import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectGroup, SelectValue } from "@/components/ui/select";
import { Home, MapPin, Mailbox, Map, Globe } from "lucide-react";
import { FormField } from "./FormField";
import { ZONE_TYPES } from "@/config/simulatorFormOptions";
import { COUNTRIES } from "@/config/simulatorFormOptions";

export function LocationCard() {
  return (
    <div className="space-y-6">
      <FormField label="Pays" htmlFor="country" icon={Globe} required>
        <Select defaultValue="fr">
          <SelectTrigger id="country">
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
        <Input id="address" placeholder="Tapez et sélectionnez une adresse..." />
      </FormField>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Ville" htmlFor="city" icon={MapPin} required hint="Rempli automatiquement">
          <Input id="city" placeholder="Rechercher une ville..." defaultValue="Lyon" />
        </FormField>
        <FormField label="Code postal" htmlFor="zip" icon={Mailbox} required hint="Rempli automatiquement">
          <Input id="zip" placeholder="Ex: 75001" defaultValue="69003" className="opacity-50" />
        </FormField>
      </div>

      <FormField label="Type de zone" htmlFor="zone" icon={Map} required>
        <Select>
          <SelectTrigger id="zone">
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
