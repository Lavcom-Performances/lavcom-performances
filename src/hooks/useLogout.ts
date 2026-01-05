import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

// Keys to clear on logout (app-specific)
const APP_STORAGE_KEYS = [
  'selectedSiteId',
  'company_logo',
  'onboarding_completed',
  'tutorial_completed',
  'analytics_cache',
  'chart_preferences',
  'demo_mode',
];

// Clear all Supabase auth tokens from storage
function clearSupabaseStorage() {
  // Clear localStorage keys starting with 'sb-' (Supabase auth tokens)
  const localStorageKeys = Object.keys(localStorage);
  localStorageKeys.forEach((key) => {
    if (key.startsWith('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear app-specific keys
  APP_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
  
  // Clear sessionStorage Supabase keys
  const sessionStorageKeys = Object.keys(sessionStorage);
  sessionStorageKeys.forEach((key) => {
    if (key.startsWith('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
}

export function useLogout() {
  const { t } = useTranslation(['app', 'common']);

  const logout = async () => {
    try {
      // Sign out globally from Supabase (invalidates all sessions)
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      // Continue with cleanup even if signOut fails
      console.error('Sign out error:', error);
    }
    
    // Clear all storage
    clearSupabaseStorage();
    
    // Show toast before redirect
    toast({
      title: t('app:auth.loggedOut'),
      description: t('app:auth.loggedOutDescription'),
    });
    
    // Hard reload to /login to ensure React state is fully cleared
    window.location.replace('/login?logged_out=1');
    
    return true;
  };

  return { logout };
}
