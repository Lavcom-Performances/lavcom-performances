import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';

interface StripeLastEvent {
  event_type: string;
  created_at: string;
}

export function PaymentStatusIndicators() {
  const { t } = useTranslation('app');
  const { subscription, isSubscriptionActive, lastInvoiceUrl, loading: subLoading } = useSubscription();
  const [lastEvent, setLastEvent] = useState<StripeLastEvent | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Determine Stripe mode from publishable key
  const stripeKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const isTestMode = stripeKey.startsWith('pk_test_');
  const isLiveMode = stripeKey.startsWith('pk_live_');
  const stripeMode = isTestMode ? 'TEST' : isLiveMode ? 'LIVE' : 'UNKNOWN';

  const fetchLastEvent = async () => {
    try {
      const { data, error } = await supabase.rpc('rpc_stripe_last_event');
      if (!error && data && data.length > 0) {
        setLastEvent(data[0]);
      } else {
        setLastEvent(null);
      }
    } catch (err) {
      console.error('Error fetching last Stripe event:', err);
      setLastEvent(null);
    } finally {
      setWebhookLoading(false);
    }
  };

  useEffect(() => {
    fetchLastEvent();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLastEvent();
    setRefreshing(false);
  };

  // Webhook is OK if last event was received less than 5 minutes ago
  const isWebhookOk = lastEvent 
    ? (new Date().getTime() - new Date(lastEvent.created_at).getTime()) < 5 * 60 * 1000
    : false;

  // Access is OK if subscription is active
  const isAccessOk = isSubscriptionActive;

  // Invoice is OK if lastInvoiceUrl is present
  const isInvoiceOk = !!lastInvoiceUrl;

  const StatusIndicator = ({ 
    label, 
    isOk, 
    loading = false,
    details 
  }: { 
    label: string; 
    isOk: boolean; 
    loading?: boolean;
    details?: string;
  }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {loading ? (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : isOk ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {details && (
          <span className="text-xs text-muted-foreground">{details}</span>
        )}
        <Badge variant={loading ? 'secondary' : isOk ? 'default' : 'destructive'} className="text-xs">
          {loading ? '...' : isOk ? 'OK' : 'KO'}
        </Badge>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Statut paiement
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Mode Stripe */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            {stripeMode === 'TEST' ? (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            ) : stripeMode === 'LIVE' ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm font-medium">Mode</span>
          </div>
          <Badge 
            variant={stripeMode === 'LIVE' ? 'default' : stripeMode === 'TEST' ? 'secondary' : 'destructive'}
            className="text-xs"
          >
            {stripeMode}
          </Badge>
        </div>
        
        {stripeMode === 'TEST' && (
          <p className="text-xs text-muted-foreground pl-6 pb-2">
            Utilisez la carte 4242 4242 4242 4242 pour tester
          </p>
        )}

        {/* Webhook Status */}
        <StatusIndicator
          label="Webhook"
          isOk={isWebhookOk}
          loading={webhookLoading}
          details={lastEvent ? new Date(lastEvent.created_at).toLocaleTimeString('fr-FR') : undefined}
        />

        {/* Access Status */}
        <StatusIndicator
          label="Accès"
          isOk={isAccessOk}
          loading={subLoading}
          details={subscription?.status}
        />

        {/* Invoice Status */}
        <StatusIndicator
          label="Facture"
          isOk={isInvoiceOk}
          loading={subLoading}
        />
      </CardContent>
    </Card>
  );
}
