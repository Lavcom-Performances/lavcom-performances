import type { DashboardScenario } from "@/types/dashboard-simulator";
import { MOCK_PROJECTS } from "./mock-projects";

const NAMES = [
  "Réaliste",
  "Optimiste",
  "Pessimiste",
  "Équilibré",
  "Prudent",
  "Ambitieux",
  "Volume maximal",
  "Charges réduites",
];

function daysAgo(n: number): string {
  const d = new Date(2026, 5, 20);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const MOCK_SCENARIOS: DashboardScenario[] = MOCK_PROJECTS.flatMap((project, pIndex) =>
  Array.from({ length: project.scenarioCount }, (_, sIndex) => {
    const complete = sIndex % 3 === 0;
    const step = complete ? 3 : (sIndex % 3);
    const base = 13_100 + pIndex * 380 + sIndex * 610;

    return {
      id: `scenario-${pIndex + 1}-${sIndex + 1}`,
      projectId: project.id,
      name: NAMES[sIndex % NAMES.length],
      status: complete ? "validated" : "in_progress",
      progress: complete ? 100 : Math.round((step / 3) * 100),
      step: complete ? 3 : Math.max(step, 1),
      totalSteps: 3,
      isReference: sIndex === 0,
      updatedAt: daysAgo(sIndex * 2 + pIndex),
      kpis: {
        estimatedRevenue: complete ? base : null,
        monthlyResult: complete ? 3_820 + sIndex * 340 : null,
        breakEven: complete ? 9_410 - sIndex * 110 : null,
        roiMonths: complete ? 22 - sIndex * 2 : null,
        fixedCosts: complete ? 4_200 + sIndex * 120 : null,
        variableRate: complete ? 22 - sIndex : null,
        cyclesPerDay: complete ? 82 + sIndex * 11 : null,
      },
    } satisfies DashboardScenario;
  }),
);
