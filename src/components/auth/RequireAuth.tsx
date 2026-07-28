import { createContext, useContext, type ReactNode } from "react";
import { MOCK_USER } from "@/mocks/dashboard-simulator/mock-user";
import type { DashboardUser } from "@/types/dashboard-simulator";

interface MockAuthValue {
  user: DashboardUser;
  isMocked: boolean;
}

const MockAuthContext = createContext<MockAuthValue>({ user: MOCK_USER, isMocked: true });

/**
 * Development guard: no network call, always grants access and exposes a mocked user.
 * Swapped for `ProtectedRoute` in production via `DashboardRouteGuard`.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  return (
    <MockAuthContext.Provider value={{ user: MOCK_USER, isMocked: true }}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockUser(): DashboardUser {
  return useContext(MockAuthContext).user;
}
