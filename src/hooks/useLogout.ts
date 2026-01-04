import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function useLogout() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t } = useTranslation(['app', 'common']);

  const logout = async () => {
    // Clear local storage data
    localStorage.removeItem('selectedSiteId');
    localStorage.removeItem('company_logo');
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('tutorial_completed');
    
    // Sign out from auth
    const { error } = await signOut();
    
    if (error) {
      toast({
        title: t('common:error'),
        description: t('app:auth.logoutError'),
        variant: 'destructive',
      });
      return false;
    }
    
    // Show success toast
    toast({
      title: t('app:auth.loggedOut'),
      description: t('app:auth.loggedOutDescription'),
    });
    
    // Redirect to login
    navigate('/login', { replace: true });
    return true;
  };

  return { logout };
}
