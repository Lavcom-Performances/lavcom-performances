import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  trial_start_date: string | null;
  trial_end_date: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  current_period_end: string | null;
  laundry_count: number;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  last_invoice_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSubscription(user.id);
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const fetchSubscription = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!error && data) {
      setSubscription(data);
    }
    setLoading(false);
  };

  const calculateDaysRemaining = (): number => {
    if (!subscription?.trial_end_date) return 0;
    
    const now = new Date();
    const end = new Date(subscription.trial_end_date);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isTrialActive = (): boolean => {
    if (!subscription) return false;
    if (subscription.plan_type !== 'trial') return false;
    if (subscription.status !== 'active') return false;
    return calculateDaysRemaining() > 0;
  };

  const isSubscriptionActive = (): boolean => {
    if (!subscription) return false;
    
    // Paid subscription
    if (subscription.plan_type !== 'trial' && subscription.status === 'active') {
      if (subscription.subscription_end_date) {
        return new Date(subscription.subscription_end_date) > new Date();
      }
      return true;
    }
    
    // Trial
    return isTrialActive();
  };

  const getTrialStatus = (): 'active' | 'warning' | 'critical' | 'expired' => {
    const days = calculateDaysRemaining();
    if (days <= 0) return 'expired';
    if (days <= 3) return 'critical';
    if (days <= 7) return 'warning';
    return 'active';
  };

  return {
    subscription,
    loading,
    daysRemaining: calculateDaysRemaining(),
    isTrialActive: isTrialActive(),
    isSubscriptionActive: isSubscriptionActive(),
    isExpired: subscription?.plan_type === 'trial' && calculateDaysRemaining() <= 0,
    planType: subscription?.plan_type ?? null,
    trialStatus: getTrialStatus(),
    lastInvoiceUrl: subscription?.last_invoice_url ?? null,
    stripeSubscriptionId: subscription?.stripe_subscription_id ?? null,
    stripeCustomerId: subscription?.stripe_customer_id ?? null,
    refetch: () => user && fetchSubscription(user.id),
  };
}
