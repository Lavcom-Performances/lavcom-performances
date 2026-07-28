import { useState } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { MOCK_PROJECTS } from "@/mocks/dashboard-simulator/mock-projects";
import { MOCK_SCENARIOS } from "@/mocks/dashboard-simulator/mock-scenarios";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
}

/** Two-level collapsible navigation: My projects > project > scenarios. */
export function AppSidebarProjectsNav({ icon: Icon }: Props) {
  const { pathname } = useLocation();
  const { projectId } = useParams();
  const isProjectsSection = pathname.startsWith("/dashboard-simulator/projects");
  const [openRoot, setOpenRoot] = useState(isProjectsSection);
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>(
    projectId ? { [projectId]: true } : {},
  );

  const toggleProject = (id: string) =>
    setOpenProjects((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <Collapsible open={openRoot} onOpenChange={setOpenRoot} className="group/collapsible">
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === "/dashboard-simulator/projects"}
          tooltip={COMMON_STRINGS.nav.projects}
        >
          <NavLink to="/dashboard-simulator/projects" end>
            <Icon />
            <span>{COMMON_STRINGS.nav.projects}</span>
          </NavLink>
        </SidebarMenuButton>

        <CollapsibleTrigger asChild>
          <SidebarMenuAction
            className="data-[state=open]:rotate-90"
            data-state={openRoot ? "open" : "closed"}
            aria-label={COMMON_STRINGS.nav.projects}
          >
            <ChevronRight />
          </SidebarMenuAction>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub className="max-h-[40vh] overflow-y-auto">
            {MOCK_PROJECTS.map((project) => {
              const scenarios = MOCK_SCENARIOS.filter((s) => s.projectId === project.id);
              const isOpen = Boolean(openProjects[project.id]);
              const projectPath = `/dashboard-simulator/projects/${project.id}`;

              return (
                <SidebarMenuSubItem key={project.id}>
                  <div className="relative flex items-center">
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === projectPath}
                      className="flex-1 pr-6"
                    >
                      <NavLink to={projectPath} end>
                        <span className="truncate">{project.name}</span>
                      </NavLink>
                    </SidebarMenuSubButton>

                    {scenarios.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleProject(project.id)}
                        aria-label={`${COMMON_STRINGS.breadcrumb.scenarios} – ${project.name}`}
                        className="absolute right-0 flex h-5 w-5 items-center justify-center rounded text-sidebar-foreground/70 hover:bg-sidebar-accent"
                      >
                        <ChevronRight
                          className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")}
                        />
                      </button>
                    )}
                  </div>

                  {isOpen && scenarios.length > 0 && (
                    <SidebarMenuSub className="mt-1">
                      {scenarios.map((scenario) => {
                        const scenarioPath = `${projectPath}/scenarios/${scenario.id}`;
                        return (
                          <SidebarMenuSubItem key={scenario.id}>
                            <SidebarMenuSubButton
                              asChild
                              size="sm"
                              isActive={pathname === scenarioPath}
                            >
                              <NavLink to={scenarioPath}>
                                <span className="truncate">{scenario.name}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
