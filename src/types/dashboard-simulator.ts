/**
 * Types for the project-holder dashboard (`/dashboard-simulator`).
 * Fully isolated from the operator dashboard (`src/components/dashboard/`).
 */

export type DashboardStatus = "validated" | "in_progress";

export interface DashboardKpiSet {
  /** Estimated monthly revenue in EUR, null when not computed yet */
  estimatedRevenue: number | null;
  /** Monthly result (can be negative) in EUR */
  monthlyResult: number | null;
  /** Break-even point per month in EUR */
  breakEven: number | null;
  /** Return on investment in months */
  roiMonths: number | null;
  /** Fixed monthly costs in EUR */
  fixedCosts: number | null;
  /** Variable rate as a percentage (0-100) */
  variableRate: number | null;
  /** Required cycles per day */
  cyclesPerDay: number | null;
}

export interface DashboardProject {
  id: string;
  name: string;
  city: string;
  district: string;
  surface: number;
  zone: string;
  status: DashboardStatus;
  createdAt: string;
  updatedAt: string;
  scenarioCount: number;
  /** Id of the scenario currently applied to the project */
  mainScenarioId: string | null;
  mainScenarioName: string | null;
  kpis: DashboardKpiSet;
  address: string;
  postalCode: string;
  country: string;
  zoneType: string;
  openingHours: string;
}

export interface DashboardScenario {
  id: string;
  projectId: string;
  name: string;
  status: DashboardStatus;
  /** Completion percentage 0-100 */
  progress: number;
  /** Current step (1-based) */
  step: number;
  totalSteps: number;
  isReference: boolean;
  updatedAt: string;
  kpis: DashboardKpiSet;
}

export interface DashboardReport {
  id: string;
  date: string;
  description: string;
  /** Kind of report, used for filtering later */
  kind: "project" | "scenario_comparison" | "project_comparison";
  fileUrl: string | null;
}

export interface DashboardInvoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  fileUrl: string | null;
}

export interface PackInfo {
  id: string;
  name: string;
  status: "active" | "expired";
  totalDays: number;
  usedDays: number;
  totalProjects: number;
  usedProjects: number;
  expiresOn: string;
  features: string[];
}

export interface DashboardActivityItem {
  id: string;
  label: string;
  timeAgo: string;
  kind: "scenario" | "report" | "project";
}

export interface DashboardUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  siret: string;
  memberSince: string;
  emailVerified: boolean;
  initials: string;
  language: string;
  emailNotifications: boolean;
}

/** Shared contract for every dashboard data hook (mock today, query tomorrow). */
export interface DashboardQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
}

export type DashboardSortBy = "date" | "name" | "status";
export type DashboardStatusFilter = "all" | DashboardStatus;
