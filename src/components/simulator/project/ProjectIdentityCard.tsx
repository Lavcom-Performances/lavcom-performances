import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { FormField } from "@/components/simulator/shared/FormField";
import { MOCK_PROJECT } from "@/components/simulator/mockData";

export function ProjectIdentityCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Détails du projet
        </CardTitle>
        <CardDescription>
          Ces informations nous aideront à personnaliser votre simulation
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <FormField label="Nom du projet" htmlFor="project-name">
          <Input id="project-name" defaultValue={MOCK_PROJECT.projectName} />
        </FormField>
        <FormField label="Nom du scénario" htmlFor="scenario-name">
          <Input id="scenario-name" defaultValue={MOCK_PROJECT.scenarioName} />
        </FormField>
        <FormField label="Pays" htmlFor="country" className="md:col-span-2">
          <Select defaultValue="fr">
            <SelectTrigger id="country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">
                <span className="mr-2">{MOCK_PROJECT.countryFlag}</span>
                {MOCK_PROJECT.country}
              </SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </CardContent>
    </Card>
  );
}
