import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, ClipboardPenLine, Globe } from "lucide-react";
import { FormField } from "./FormField";
import { MOCK_PROJECT } from "@/components/simulator/mockData";

export function ProjectIdentityCard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Nom du projet" htmlFor="project-name" icon={Store} required>
          <Input id="project-name" defaultValue={MOCK_PROJECT.projectName} />
        </FormField>
        <FormField label="Nom du scénario" htmlFor="scenario-name" icon={ClipboardPenLine} required>
          <Input id="scenario-name" defaultValue={MOCK_PROJECT.scenarioName} />
        </FormField>
      </div>
      <FormField label="Pays" htmlFor="country" icon={Globe} required>
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
    </div>
  );
}
