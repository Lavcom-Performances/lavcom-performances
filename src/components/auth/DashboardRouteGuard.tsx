import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RequireAuth } from "@/components/auth/RequireAuth";

/**
 * Switches between the real Supabase guard and the mocked dev guard.
 * `VITE_DEV_MODE` is intentionally distinct from Vite's `import.meta.env.DEV`
 * so the dashboard can be QA'd on a preview deployment without a real login.
 */
export function DashboardRouteGuard({ children }: { children: ReactNode }) {
  const devMode = import.meta.env.VITE_DEV_MODE !== "false";

  if (devMode) {
    return <RequireAuth>{children}</RequireAuth>;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
}
