import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { SimulatorTabsTrigger } from "./SimulatorTabsTrigger";
import { ProjectInfoForm } from "./ProjectInfoForm";
import { LocalConstraintsForm } from "./LocalConstraintsForm";
import { useTranslation } from "react-i18next";

interface Props {
  value?: string;
  onValueChange?: (v: string) => void;
  projectErrorCount?: number;
  localErrorCount?: number;
  showErrorBadges?: boolean;
}

export function ProjectTabs({
  value,
  onValueChange,
  projectErrorCount = 0,
  localErrorCount = 0,
  showErrorBadges = false,
}: Props) {
  const { t } = useTranslation("paid-simulator");
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      defaultValue={value ? undefined : "project"}
      className="w-full"
    >
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <SimulatorTabsTrigger value="project">
          <span className="inline-flex items-center gap-2">
            {t("project.tabs.project")}
            {showErrorBadges && projectErrorCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                <AlertCircle className="h-3 w-3" />
                {projectErrorCount}
              </span>
            )}
          </span>
        </SimulatorTabsTrigger>
        <SimulatorTabsTrigger value="local">
          <span className="inline-flex items-center gap-2">
            {t("project.tabs.local")}
            {showErrorBadges && localErrorCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                <AlertCircle className="h-3 w-3" />
                {localErrorCount}
              </span>
            )}
          </span>
        </SimulatorTabsTrigger>
      </TabsList>
      <TabsContent value="project" className="mt-8">
        <ProjectInfoForm />
      </TabsContent>
      <TabsContent value="local" className="mt-8">
        <LocalConstraintsForm />
      </TabsContent>
    </Tabs>
  );
}
