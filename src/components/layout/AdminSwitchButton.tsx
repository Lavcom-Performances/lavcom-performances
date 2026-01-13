import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformRole } from "@/hooks/usePlatformRole";
import { getLastAdminPath, getLastSaasPath, isAdminPath } from "@/lib/navigation/lastPaths";
import { setAppContext } from "@/lib/navigation/appContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminSwitchButtonProps {
  variant?: "header" | "compact";
}

/**
 * Button that allows platform users (super_admin, admin, billing) to switch between SaaS and Admin modes.
 * Only visible for users with platform roles.
 */
export function AdminSwitchButton({ variant = "header" }: AdminSwitchButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['app']);
  const { isPlatformAdmin, isPlatformBilling, isLoading } = usePlatformRole();

  // Don't show if not a platform user or still loading
  if (isLoading || (!isPlatformAdmin && !isPlatformBilling)) {
    return null;
  }

  const isInAdmin = isAdminPath(location.pathname);

  const handleSwitch = () => {
    if (isInAdmin) {
      // Switch to SaaS - update context and navigate
      setAppContext('saas');
      const lastPath = getLastSaasPath();
      navigate(lastPath || '/select-laundromat');
    } else {
      // Switch to Admin - update context and navigate
      setAppContext('platform');
      const lastPath = getLastAdminPath();
      
      // Billing-only users go to /admin/sales
      if (!isPlatformAdmin && isPlatformBilling) {
        navigate(lastPath?.startsWith('/admin/sales') ? lastPath : '/admin/sales');
      } else {
        navigate(lastPath || '/admin');
      }
    }
  };

  const buttonLabel = isInAdmin 
    ? t('app:platformAdmin.switchToSaas', 'Laveries')
    : t('app:platformAdmin.switchToAdmin', 'Administration');

  const Icon = isInAdmin ? Building2 : Shield;

  if (variant === "compact") {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSwitch}
              className={isInAdmin 
                ? "text-blue-200 hover:text-white hover:bg-blue-800/50" 
                : "text-primary hover:text-primary/80"
              }
            >
              <Icon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{buttonLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant={isInAdmin ? "ghost" : "outline"}
      size="sm"
      onClick={handleSwitch}
      className={isInAdmin 
        ? "text-blue-200 hover:text-white hover:bg-blue-800/50 gap-2" 
        : "gap-2 border-primary/30 text-primary hover:bg-primary/10"
      }
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{buttonLabel}</span>
    </Button>
  );
}
