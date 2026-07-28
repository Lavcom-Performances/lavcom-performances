import { MOCK_PACK } from "@/mocks/dashboard-simulator/mock-user";
import { MOCK_ACTIVITY } from "@/mocks/dashboard-simulator/mock-activity";
import type {
  DashboardActivityItem,
  DashboardQueryResult,
  PackInfo,
} from "@/types/dashboard-simulator";
import { useMockQuery } from "./use-mock-query";

export function useDashboardPack(): DashboardQueryResult<PackInfo> {
  return useMockQuery(() => MOCK_PACK, [], 250);
}

export function useDashboardActivity(): DashboardQueryResult<DashboardActivityItem[]> {
  return useMockQuery(() => MOCK_ACTIVITY, [], 300);
}
