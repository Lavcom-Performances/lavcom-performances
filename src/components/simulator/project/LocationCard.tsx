import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, MapPin, Mailbox, Map } from "lucide-react";
import { FormField } from "./FormField";
import { ZONE_TYPES } from "@/components/simulator/mockData";

export function LocationCard() {
  return (
    <div className="space-y-6">
      <FormField
        label="Adresse du local"
        htmlFor="address"
        icon={Home}
        hint="💡 Sélectionnez une adresse dans la liste pour remplir automatiquement la ville et le code postal"
      >
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="address" placeholder="Tapez et sélectionnez une adresse..." className="pl-9" />
        </div>
      </FormField>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Ville" htmlFor="city" icon={MapPin} required hint="Rempli automatiquement">
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="city" placeholder="Rechercher une ville..." defaultValue="Lyon" className="pl-9" />
          </div>
        </FormField>
        <FormField label="Code postal" htmlFor="zip" icon={Mailbox} hint="Rempli automatiquement">
          <Input id="zip" placeholder="Ex: 75001" defaultValue="69003" className="opacity-50" />
        </FormField>
      </div>

      <FormField label="Type de zone" htmlFor="zone" icon={Map} required>
        <Select defaultValue="urbaine">
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
