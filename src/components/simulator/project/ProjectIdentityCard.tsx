import { Input } from "@/components/ui/input";
import { Store, ClipboardPenLine } from "lucide-react";
import { FormField } from "./FormField";
import type { SimulatorProjectFormProps } from "./types";

export function ProjectIdentityCard({ project, onUpdate }: SimulatorProjectFormProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <FormField label="Nom du projet" htmlFor="project-name" icon={Store} required>
        <Input
          id="project-name"
          placeholder="Ex. : Laverie Bastille"
          className="bg-white shadow-form"
          required
          value={project.projectName ?? ""}
          onChange={(e) => onUpdate({ projectName: e.target.value })}
        />
      </FormField>
      <FormField label="Nom du scénario" htmlFor="scenario-name" icon={ClipboardPenLine} required>
        <Input
          id="scenario-name"
          className="bg-white shadow-form"
          required
          value={project.scenarioName ?? ""}
          onChange={(e) => onUpdate({ scenarioName: e.target.value })}
        />
      </FormField>
    </div>
  );
}
