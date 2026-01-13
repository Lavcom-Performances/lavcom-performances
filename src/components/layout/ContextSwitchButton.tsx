/**
 * Context Switch Button - For platform users to switch between admin and SaaS
 * 
 * Only visible to platform_admin and platform_billing users
 */

import { Building2, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePlatformRole } from "@/hooks/usePlatformRole";
import { setAppContext, getAppContext } from "@/lib/navigation/appContext";
import { getLastAdminPath, getLastSaasPath, isAdminPath } from "@/lib/navigation/lastPaths";
import { useTranslation } from "react-i18next";

export function ContextSwitchButton() {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { isPlatformAdmin, isPlatformBilling, isLoading } = usePlatformRole();

  // Only show for platform users
  if (isLoading || (!isPlatformAdmin && !isPlatformBilling)) {
    return null;
  }

  const isInAdminArea = isAdminPath(location.pathname);

  const handleSwitch = () => {
    if (isInAdminArea) {
      // Switch to SaaS
      setAppContext('saas');
      const lastSaasPath = getLastSaasPath();
      navigate(lastSaasPath || '/select-laundromat');
    } else {
      // Switch to Platform Admin
      setAppContext('platform');
      const lastAdminPath = getLastAdminPath();
      
      // Billing-only users go to /admin/sales
      if (!isPlatformAdmin && isPlatformBilling) {
        navigate(lastAdminPath?.startsWith('/admin/sales') ? lastAdminPath : '/admin/sales');
      } else {
        navigate(lastAdminPath || '/admin');
      }
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSwitch}
      className="gap-2"
    >
      {isInAdminArea ? (
        <>
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">{t('app:nav.switchToSaas', 'Laveries')}</span>
        </>
      ) : (
        <>
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">{t('app:nav.switchToAdmin', 'Administration')}</span>
        </>
      )}
    </Button>
  );
}
