import type { DashboardReport } from "@/types/dashboard-simulator";

export const MOCK_REPORTS: DashboardReport[] = [
  {
    id: "report-1",
    date: "2026-05-05",
    description: "Comparatif Laverie Bastille vs Laverie République",
    kind: "project_comparison",
    fileUrl: null,
  },
  {
    id: "report-2",
    date: "2026-05-13",
    description: "Comparatif Laverie Bastille : Scénario Optimiste vs Scénario Réaliste",
    kind: "scenario_comparison",
    fileUrl: null,
  },
  {
    id: "report-3",
    date: "2026-05-13",
    description: "Projet Laverie Bastille : Scénario Optimiste",
    kind: "project",
    fileUrl: null,
  },
  {
    id: "report-4",
    date: "2026-06-05",
    description: "Projet Laverie Bastille : Scénario Réaliste",
    kind: "project",
    fileUrl: null,
  },
  {
    id: "report-5",
    date: "2026-06-07",
    description: "Projet Laverie Bastille : Scénario Pessimiste",
    kind: "project",
    fileUrl: null,
  },
  {
    id: "report-6",
    date: "2026-06-11",
    description: "Projet Lyon Part-Dieu : Scénario Équilibré",
    kind: "project",
    fileUrl: null,
  },
  {
    id: "report-7",
    date: "2026-06-18",
    description: "Comparatif Toulouse Saint-Cyprien vs Marseille Joliette",
    kind: "project_comparison",
    fileUrl: null,
  },
];
