import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { MobileHeader } from "./MobileHeader";
import { AdminSwitchButton } from "./AdminSwitchButton";
import { LaundromatSelector } from "./LaundromatSelector";
import { TrialBanner } from "@/components/trial/TrialBanner";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoTutorial } from "@/components/demo/DemoTutorial";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { RequireOperationsData } from "@/components/RequireOperationsData";
import { ClosedLaundromatBanner } from "@/components/laundromat/ClosedLaundromatBanner";
import { useSubscription } from "@/hooks/useSubscription";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useActiveLaundromat } from "@/hooks/useActiveLaundromat";
import { BetaIndicator } from "@/components/beta/BetaIndicator";
const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
      ease: "easeIn" as const,
    },
  },
};

interface AppLayoutProps {
  userRole?: string;
  currentLaundromat?: string;
}

export function AppLayout({ 
  userRole = "ADMIN", 
  currentLaundromat = "Laverie Saint-Michel" 
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { daysRemaining, trialStatus, planType } = useSubscription();
  const { isDemo, siteName } = useCurrentSite();
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();
  const { activeLaundromat, isClosed, isAllLaundromats, sites } = useActiveLaundromat();

  const showTrialWarning = planType === 'trial' && (trialStatus === 'warning' || trialStatus === 'critical');
  const displayName = activeLaundromat?.name || siteName || currentLaundromat;
  const hasMultipleSites = sites.filter(s => s.status === 'active').length > 1;

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Onboarding Wizard for new users */}
      <OnboardingWizard 
        open={showOnboarding} 
        onComplete={completeOnboarding} 
        onSkip={skipOnboarding} 
      />

      {/* Demo Banner - visible on all pages when demo site is selected */}
      {isDemo && <DemoBanner />}

      {/* Demo Tutorial - shown for demo mode users */}
      {isDemo && <DemoTutorial />}

      {/* Mobile Header */}
      <MobileHeader 
        userRole={userRole}
        currentLaundromat={displayName}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <AppSidebar 
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            userRole={userRole}
            currentLaundromat={displayName}
          />
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar with laundromat selector, view mode toggle and admin switch */}
          <div className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-3">
              {/* Show selector when user has multiple sites or closed sites */}
              {(hasMultipleSites || sites.some(s => s.status === 'closed')) && (
                <LaundromatSelector variant="default" />
              )}
              {isAllLaundromats && (
                <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded-md">
                  Vue globale
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <BetaIndicator />
              <AdminSwitchButton />
              <ViewModeToggle />
            </div>
          </div>
          
          {/* Closed laundromat banner */}
          {isClosed && activeLaundromat && (
            <div className="hidden lg:block">
              <ClosedLaundromatBanner siteName={activeLaundromat.name} />
            </div>
          )}
          
          {/* Trial warning banner - only show on desktop when trial is warning/critical */}
          {showTrialWarning && (
            <div className="hidden lg:block">
              <TrialBanner 
                daysRemaining={daysRemaining} 
                status={trialStatus}
                variant="compact"
              />
            </div>
          )}
          
          <main className="flex-1 overflow-auto">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial="initial"
                animate="enter"
                exit="exit"
                variants={pageVariants}
                className="h-full"
              >
                <RequireOperationsData>
                  <Outlet />
                </RequireOperationsData>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
