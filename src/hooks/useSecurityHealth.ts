import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  calculateSecurityHealthScore, 
  getRecommendedActions,
  SecurityHealthScore,
  SecurityHealthInputs,
  RecommendedAction 
} from '@/lib/security/securityHealthScore';

export interface UseSecurityHealthResult {
  score: SecurityHealthScore | null;
  inputs: SecurityHealthInputs | null;
  recommendedActions: RecommendedAction[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  notifyNewDeviceLogin: boolean;
  setNotifyNewDeviceLogin: (value: boolean) => Promise<void>;
}

export function useSecurityHealth(): UseSecurityHealthResult {
  const { user } = useAuth();
  const [score, setScore] = useState<SecurityHealthScore | null>(null);
  const [inputs, setInputs] = useState<SecurityHealthInputs | null>(null);
  const [recommendedActions, setRecommendedActions] = useState<RecommendedAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [notifyNewDeviceLogin, setNotifyNewDeviceLoginState] = useState(true);

  const fetchSecurityHealth = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch all data in parallel
      const [
        mfaResult,
        recoveryCodesResult,
        trustedDevicesResult,
        riskyLoginsResult,
        otpFailuresResult,
        notificationPrefsResult,
      ] = await Promise.all([
        // Check MFA status
        supabase.auth.mfa.listFactors(),
        
        // Count recovery codes (unused)
        supabase
          .from('recovery_codes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('used_at', null),
        
        // Count trusted devices
        supabase
          .from('trusted_devices')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('trusted_until', now.toISOString()),
        
        // Count risky logins in last 30 days
        supabase
          .from('auth_login_events')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('risk_level', ['medium', 'high'])
          .gte('created_at', thirtyDaysAgo.toISOString()),
        
        // Count OTP failures in last 30 days
        supabase
          .from('auth_login_otps')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('verified_at', null)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        
        // Get notification preferences (cast to any to handle new column)
        supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      // Parse results
      const hasMfaEnabled = !!mfaResult.data?.totp?.some(f => f.status === 'verified');
      const hasRecoveryCodes = (recoveryCodesResult.count ?? 0) > 0;
      const trustedDeviceCount = trustedDevicesResult.count ?? 0;
      const riskyLoginsLast30Days = riskyLoginsResult.count ?? 0;
      const otpFailuresLast30Days = otpFailuresResult.count ?? 0;

      // Notification preference (default to true if not set)
      // Use type assertion since the column was just added
      const prefsData = notificationPrefsResult.data as Record<string, unknown> | null;
      const notifyPref = (prefsData?.notify_new_device_login as boolean) ?? true;
      setNotifyNewDeviceLoginState(notifyPref);

      const securityInputs: SecurityHealthInputs = {
        hasMfaEnabled,
        hasRecoveryCodes,
        trustedDeviceCount,
        riskyLoginsLast30Days,
        otpFailuresLast30Days,
      };

      setInputs(securityInputs);
      
      const calculatedScore = calculateSecurityHealthScore(securityInputs);
      setScore(calculatedScore);

      // Get recommended actions and update notification action status
      const actions = getRecommendedActions(securityInputs);
      const updatedActions = actions.map(action => {
        if (action.id === 'enable_new_device_alerts') {
          return { ...action, completed: notifyPref };
        }
        return action;
      });
      setRecommendedActions(updatedActions);

    } catch (err) {
      console.error('Error fetching security health:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch security health'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const setNotifyNewDeviceLogin = useCallback(async (value: boolean) => {
    if (!user) return;

    try {
      // Upsert notification preference
      const { error: upsertError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          notify_new_device_login: value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) throw upsertError;

      setNotifyNewDeviceLoginState(value);
      
      // Update recommended actions
      setRecommendedActions(prev => 
        prev.map(action => 
          action.id === 'enable_new_device_alerts' 
            ? { ...action, completed: value }
            : action
        )
      );

      // Log the preference change
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'NOTIFICATION_PREF_CHANGED',
        target_table: 'notification_preferences',
        target_id: user.id,
        metadata: {
          field: 'notify_new_device_login',
          old_value: !value,
          new_value: value,
        },
      });

    } catch (err) {
      console.error('Error updating notification preference:', err);
      throw err;
    }
  }, [user]);

  useEffect(() => {
    fetchSecurityHealth();
  }, [fetchSecurityHealth]);

  return {
    score,
    inputs,
    recommendedActions,
    isLoading,
    error,
    refetch: fetchSecurityHealth,
    notifyNewDeviceLogin,
    setNotifyNewDeviceLogin,
  };
}
