import { Input } from "@/components/ui/input";
import { Store, ClipboardPenLine } from "lucide-react";
import { FormField } from "./FormField";
import { defaultSimulationProject, useSimulatorProject } from "@/hooks/useSimulatorProject";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";

export function ProjectIdentityCard() {
  const { project, updateProject } = useSimulatorProjectContext();
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <FormField label="Nom du projet" htmlFor="project-name" icon={Store} required>
        <Input
          id="project-name"
          placeholder="Ex. : Laverie Bastille"
          className="bg-white shadow-form"
          required
          value={project.projectName ?? defaultSimulationProject.projectName}
          onChange={(e) => updateProject({ projectName: e.target.value })}
        />
      </FormField>
      <FormField label="Nom du scénario" htmlFor="scenario-name" icon={ClipboardPenLine} required>
        <Input
          id="scenario-name"
          className="bg-white shadow-form"
          required
          value={project.scenarioName ?? defaultSimulationProject.scenarioName}
          onChange={(e) => updateProject({ scenarioName: e.target.value })}
        />
      </FormField>
    </div>
  );
}
