import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { MobileHeader } from "./MobileHeader";
import { TrialBanner } from "@/components/trial/TrialBanner";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoTutorial } from "@/components/demo/DemoTutorial";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useSubscription } from "@/hooks/useSubscription";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { useOnboarding } from "@/hooks/useOnboarding";

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

  const showTrialWarning = planType === 'trial' && (trialStatus === 'warning' || trialStatus === 'critical');
  const displayName = siteName || currentLaundromat;

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
          {/* Top bar with view mode toggle */}
          <div className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex-1" />
            <ViewModeToggle />
          </div>
          
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
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
