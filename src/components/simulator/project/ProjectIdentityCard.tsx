import { Input } from "@/components/ui/input";
import { Store, ClipboardPenLine } from "lucide-react";
import { FormField } from "./FormField";
import { MOCK_PROJECT } from "@/components/simulator/mockData";

export function ProjectIdentityCard() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <FormField label="Nom du projet" htmlFor="project-name" icon={Store} required>
        <Input id="project-name" defaultValue={MOCK_PROJECT.projectName} />
      </FormField>
      <FormField label="Nom du scénario" htmlFor="scenario-name" icon={ClipboardPenLine} required>
        <Input id="scenario-name" defaultValue={MOCK_PROJECT.scenarioName} />
      </FormField>
    </div>
  );
}
