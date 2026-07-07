import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { FormField } from "@/components/simulator/shared/FormField";
import { ZONE_TYPES } from "@/components/simulator/mockData";

export function LocationCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-primary" />
          Localisation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          label="Adresse du local"
          htmlFor="address"
          hint="💡 Sélectionnez une adresse dans la liste pour remplir automatiquement la ville et le code postal"
        >
          <Input id="address" placeholder="Tapez et sélectionnez une adresse..." />
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Ville" htmlFor="city">
            <Input id="city" placeholder="Rechercher une ville..." defaultValue="Lyon" />
          </FormField>
          <FormField label="Code postal" htmlFor="zip" hint="Rempli automatiquement">
            <Input id="zip" placeholder="Ex: 75001" defaultValue="69003" />
          </FormField>
        </div>

        <FormField label="Type de zone" htmlFor="zone">
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
      </CardContent>
    </Card>
  );
}
