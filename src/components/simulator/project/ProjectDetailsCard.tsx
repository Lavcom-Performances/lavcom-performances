import { FormCard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/form-card";
import { Building2 } from "lucide-react";
import { ProjectIdentityCard } from "./ProjectIdentityCard";
import { LocationCard } from "./LocationCard";
import { OpeningHoursCard } from "./OpeningHoursCard";
import { useTranslation } from "react-i18next";

export function ProjectDetailsCard() {
  const { t } = useTranslation("paid-simulator");
  return (
    <FormCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {t("project.detailsCard.title")}
        </CardTitle>
        <CardDescription>{t("project.detailsCard.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProjectIdentityCard />
        <LocationCard />
        <OpeningHoursCard />
      </CardContent>
    </FormCard>
  );
}
