import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  userRole?: string;
  currentLaundromat?: string;
}

export function AppLayout({ 
  userRole = "ADMIN", 
  currentLaundromat = "Laverie Saint-Michel" 
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background">
      <AppSidebar 
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        userRole={userRole}
        currentLaundromat={currentLaundromat}
      />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
