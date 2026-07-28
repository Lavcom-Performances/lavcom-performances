import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WelcomeHeader } from "@/components/dashboard-simulator/layout/WelcomeHeader";
import { PackSummaryCard } from "@/components/dashboard-simulator/overview/PackSummaryCard";
import { ProjectsStatsCard } from "@/components/dashboard-simulator/overview/ProjectsStatsCard";
import { ProjectsPreviewList } from "@/components/dashboard-simulator/overview/ProjectsPreviewList";
import { RecentActivityCard } from "@/components/dashboard-simulator/overview/RecentActivityCard";
import { SuggestionsCard } from "@/components/dashboard-simulator/overview/SuggestionsCard";
import { useMockUser } from "@/components/auth/RequireAuth";
import { OVERVIEW_STRINGS, PROJECTS_STRINGS } from "@/constants/dashboard-simulator/projects.strings";
import { fillTemplate } from "@/components/dashboard-simulator/shared/format";

export default function DashboardPage() {
  const user = useMockUser();

  return (
    <div className="space-y-6">
      <WelcomeHeader
        title={fillTemplate(OVERVIEW_STRINGS.greeting, { firstName: user.firstName })}
        subtitle={OVERVIEW_STRINGS.subtitle}
        actions={
          <Button asChild className="gap-2">
            <Link to="/simulator/project">
              <Plus className="h-4 w-4" />
              {PROJECTS_STRINGS.newProject}
            </Link>
          </Button>
        }
      />

      <PackSummaryCard />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ProjectsStatsCard />
          <ProjectsPreviewList />
        </div>
        <div className="space-y-6">
          <RecentActivityCard />
          <SuggestionsCard />
        </div>
      </div>
    </div>
  );
}
