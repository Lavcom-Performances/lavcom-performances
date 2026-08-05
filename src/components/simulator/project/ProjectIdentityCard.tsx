import { Input } from "@/components/ui/input";
import { Store, ClipboardPenLine } from "lucide-react";
import { FormField } from "./FormField";
import { defaultSimulationProject, useSimulatorProject } from "@/hooks/useSimulatorProject";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { useSimulatorStepErrors } from "@/contexts/SimulatorStepContext";
import { useTranslation } from "react-i18next";

export function ProjectIdentityCard() {
  const { t } = useTranslation("paid-simulator");
  const { project, updateProject } = useSimulatorProjectContext();
  const { fieldError } = useSimulatorStepErrors();
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <FormField
        label={t("project.identity.projectName")}
        htmlFor="project-name"
        icon={Store}
        required
        error={fieldError("projectName")}
      >
        <Input
          id="project-name"
          placeholder={t("project.identity.projectNamePlaceholder")}
          className="bg-white shadow-form"
          required
          aria-invalid={Boolean(fieldError("projectName"))}
          value={project.projectName ?? defaultSimulationProject.projectName}
          onChange={(e) => updateProject({ projectName: e.target.value })}
        />
      </FormField>
      <FormField
        label={t("project.identity.scenarioName")}
        htmlFor="scenario-name"
        icon={ClipboardPenLine}
        required
        error={fieldError("scenarioName")}
      >
        <Input
          id="scenario-name"
          className="bg-white shadow-form"
          required
          aria-invalid={Boolean(fieldError("scenarioName"))}
          value={project.scenarioName ?? defaultSimulationProject.scenarioName}
          onChange={(e) => updateProject({ scenarioName: e.target.value })}
        />
      </FormField>
    </div>
  );
}
