import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileHeader } from "./MobileHeader";

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
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Mobile Header */}
      <MobileHeader 
        userRole={userRole}
        currentLaundromat={currentLaundromat}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <AppSidebar 
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            userRole={userRole}
            currentLaundromat={currentLaundromat}
          />
        </div>
        
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
