import { TabSectionHeading } from "./TabSectionHeading";
import { ProjectDetailsCard } from "./ProjectDetailsCard";
import { useTranslation } from "react-i18next";

export function ProjectInfoForm() {
  const { t } = useTranslation("paid-simulator");
  return (
    <div className="space-y-8">
      <TabSectionHeading
        title={t("project.infoSection.title")}
        description={t("project.infoSection.description")}
      />
      <ProjectDetailsCard />
    </div>
  );
}
