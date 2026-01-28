import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { toast } from "@/hooks/use-toast";

// Demo session timeout in milliseconds (30 minutes)
const DEMO_SESSION_TIMEOUT = 30 * 60 * 1000;

// Admin routes that should be blocked in demo mode
const BLOCKED_ROUTES_IN_DEMO = [
  '/admin',
  '/admin/',
  '/company/roles',
  '/company/settings',
  '/platform',
];

// Features disabled in demo mode
const DEMO_DISABLED_FEATURES = {
  imports: true,
  exports: true,
  checkout: true,
  subscriptionManagement: true,
  teamManagement: true,
  siteSettings: true,
  profileEdits: true,
} as const;

export type DemoDisabledFeature = keyof typeof DEMO_DISABLED_FEATURES;

interface DemoContextState {
  isInDemoMode: boolean;
  demoSessionExpiresAt: number | null;
  isResetting: boolean;
  resetDemo: () => Promise<void>;
  exitDemo: () => Promise<void>;
  isFeatureDisabled: (feature: DemoDisabledFeature) => boolean;
  isRouteBlocked: (path: string) => boolean;
  demoSessionRemainingSeconds: number | null;
  extendDemoSession: () => void;
}

export function useDemoContext(): DemoContextState {
  const { user, session } = useAuth();
  const { isDemo, currentSiteId } = useCurrentSite();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isResetting, setIsResetting] = useState(false);
  const [demoSessionExpiresAt, setDemoSessionExpiresAt] = useState<number | null>(null);
  const [demoSessionRemainingSeconds, setDemoSessionRemainingSeconds] = useState<number | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize demo session tracking
  useEffect(() => {
    if (isDemo) {
      const storedExpiry = localStorage.getItem("demo_session_expires_at");
      if (storedExpiry) {
        const expiry = parseInt(storedExpiry, 10);
        if (expiry > Date.now()) {
          setDemoSessionExpiresAt(expiry);
        } else {
          // Session expired - auto-exit demo
          handleSessionExpiry();
        }
      } else {
        // Start new demo session
        extendDemoSession();
      }
    } else {
      // Not in demo mode - clear session tracking
      setDemoSessionExpiresAt(null);
      setDemoSessionRemainingSeconds(null);
      localStorage.removeItem("demo_session_expires_at");
    }
  }, [isDemo]);

  // Update remaining time countdown
  useEffect(() => {
    if (demoSessionExpiresAt && isDemo) {
      const updateRemaining = () => {
        const remaining = Math.max(0, Math.floor((demoSessionExpiresAt - Date.now()) / 1000));
        setDemoSessionRemainingSeconds(remaining);
        
        if (remaining <= 0) {
          handleSessionExpiry();
        }
      };

      updateRemaining();
      countdownIntervalRef.current = setInterval(updateRemaining, 1000);

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
  }, [demoSessionExpiresAt, isDemo]);

  // Track user activity to reset inactivity timeout
  useEffect(() => {
    if (!isDemo) return;

    const handleActivity = () => {
      // Reset the inactivity timer on user activity
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      // Extend session on activity
      const newExpiry = Date.now() + DEMO_SESSION_TIMEOUT;
      setDemoSessionExpiresAt(newExpiry);
      localStorage.setItem("demo_session_expires_at", newExpiry.toString());
    };

    // Listen for user activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isDemo]);

  // Block admin routes in demo mode
  useEffect(() => {
    if (isDemo && isRouteBlocked(location.pathname)) {
      toast({
        title: "Accès restreint",
        description: "Cette section n'est pas disponible en mode démo.",
        variant: "destructive",
      });
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, isDemo]);

  const handleSessionExpiry = useCallback(async () => {
    localStorage.removeItem("demo_session_expires_at");
    setDemoSessionExpiresAt(null);
    setDemoSessionRemainingSeconds(null);
    
    toast({
      title: "Session démo expirée",
      description: "Votre session de démonstration a expiré après 30 minutes d'inactivité.",
    });
    
    // Navigate to demo exit
    navigate('/select-laundromat', { replace: true });
  }, [navigate]);

  const extendDemoSession = useCallback(() => {
    const newExpiry = Date.now() + DEMO_SESSION_TIMEOUT;
    setDemoSessionExpiresAt(newExpiry);
    localStorage.setItem("demo_session_expires_at", newExpiry.toString());
  }, []);

  const resetDemo = useCallback(async () => {
    if (!user || !session || !currentSiteId || !isDemo) {
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser la démo.",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);

    try {
      const { data, error } = await supabase.functions.invoke("reset-demo", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Reset demo error:", error);
        throw error;
      }

      // Log event
      await supabase.rpc("rpc_log_system_event", {
        p_source: "demo_mode",
        p_severity: "info",
        p_code: "DEMO_RESET_TRIGGERED",
        p_message: "User triggered demo reset",
        p_env: import.meta.env.MODE || "production",
        p_meta: {
          user_id: user.id,
          user_email: user.email,
          site_id: currentSiteId,
          action: "reset_demo",
        },
      });

      toast({
        title: "Démo réinitialisée",
        description: `${data.operationsCount?.toLocaleString() || "~3000"} opérations régénérées.`,
      });

      // Extend session after reset
      extendDemoSession();

      // Force page refresh to reload data
      window.location.reload();

    } catch (error: any) {
      console.error("Error resetting demo:", error);
      
      // Check for rate limit error
      if (error.message?.includes('429') || error.status === 429) {
        toast({
          title: "Trop de réinitialisations",
          description: "Vous avez atteint la limite. Réessayez dans quelques minutes.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de réinitialiser la démo.",
          variant: "destructive",
        });
      }
    } finally {
      setIsResetting(false);
    }
  }, [user, session, currentSiteId, isDemo, extendDemoSession]);

  const exitDemo = useCallback(async () => {
    if (!user) return;

    try {
      // Log exit event
      await supabase.rpc("rpc_log_system_event", {
        p_source: "demo_mode",
        p_severity: "info",
        p_code: "DEMO_EXIT",
        p_message: "User exited demo mode",
        p_env: import.meta.env.MODE || "production",
        p_meta: {
          user_id: user.id,
          user_email: user.email,
          site_id: currentSiteId,
          action: "exit_demo",
        },
      });

      // Clear demo session
      localStorage.removeItem("demo_session_expires_at");
      localStorage.removeItem("selectedSiteId");
      setDemoSessionExpiresAt(null);
      setDemoSessionRemainingSeconds(null);

      toast({
        title: "Mode démo terminé",
        description: "Vous avez quitté le mode démonstration.",
      });

      navigate('/select-laundromat', { replace: true });

    } catch (error) {
      console.error("Error exiting demo:", error);
      // Still navigate even on error
      navigate('/select-laundromat', { replace: true });
    }
  }, [user, currentSiteId, navigate]);

  const isFeatureDisabled = useCallback((feature: DemoDisabledFeature): boolean => {
    if (!isDemo) return false;
    return DEMO_DISABLED_FEATURES[feature] ?? false;
  }, [isDemo]);

  const isRouteBlocked = useCallback((path: string): boolean => {
    if (!isDemo) return false;
    return BLOCKED_ROUTES_IN_DEMO.some(route => 
      path.startsWith(route) || path === route
    );
  }, [isDemo]);

  return {
    isInDemoMode: isDemo,
    demoSessionExpiresAt,
    isResetting,
    resetDemo,
    exitDemo,
    isFeatureDisabled,
    isRouteBlocked,
    demoSessionRemainingSeconds,
    extendDemoSession,
  };
}
