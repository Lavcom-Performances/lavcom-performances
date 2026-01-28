import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, 
  Shield, Key, CreditCard, Database, Settings,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReadinessCheck {
  id: string;
  name: string;
  category: 'secrets' | 'stripe' | 'security' | 'data' | 'ops';
  status: 'PASS' | 'FAIL' | 'WARN';
  reason?: string;
  link?: string;
}

interface ReadinessResult {
  status: 'READY' | 'NOT_READY';
  evaluatedAt: string;
  checks: ReadinessCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  cached?: boolean;
  cacheExpiresAt?: string;
}

const categoryConfig = {
  secrets: { icon: Key, label: 'Secrets', color: 'text-purple-500' },
  stripe: { icon: CreditCard, label: 'Stripe', color: 'text-blue-500' },
  security: { icon: Shield, label: 'Sécurité', color: 'text-orange-500' },
  data: { icon: Database, label: 'Données', color: 'text-green-500' },
  ops: { icon: Settings, label: 'Ops', color: 'text-gray-500' },
};

const statusConfig = {
  PASS: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', label: 'OK' },
  FAIL: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Échec' },
  WARN: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Attention' },
};

export function PlatformReadinessWidget() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-readiness'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('evaluate-platform-readiness');
      
      if (response.error) throw response.error;
      return response.data as ReadinessResult;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('evaluate-platform-readiness', {
        body: {},
        headers: {},
      });
      
      // Force refresh by adding query param
      const forceResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-platform-readiness?force=true`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!forceResponse.ok) throw new Error('Failed to refresh');
      return forceResponse.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['platform-readiness'], data);
      toast.success('Évaluation actualisée');
    },
    onError: () => {
      toast.error("Erreur lors de l'évaluation");
    },
  });

  const isReady = data?.status === 'READY';

  // Group checks by category
  const checksByCategory = data?.checks.reduce((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {} as Record<string, ReadinessCheck[]>) || {};

  return (
    <Card className={isReady ? 'border-green-500/50' : 'border-red-500/50'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isReady ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              {isReady ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Platform Readiness
                <Badge 
                  variant={isReady ? 'default' : 'destructive'}
                  className={isReady ? 'bg-green-500' : ''}
                >
                  {isReady ? 'READY' : 'NOT READY'}
                </Badge>
              </CardTitle>
              <CardDescription>
                Vérification de la préparation au lancement
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Réévaluer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-muted-foreground">
            Erreur lors du chargement de l'état de préparation
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-green-500/10 text-center">
                <div className="text-2xl font-bold text-green-500">{data.summary.passed}</div>
                <div className="text-xs text-muted-foreground">Réussis</div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 text-center">
                <div className="text-2xl font-bold text-red-500">{data.summary.failed}</div>
                <div className="text-xs text-muted-foreground">Échecs</div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                <div className="text-2xl font-bold text-yellow-500">{data.summary.warnings}</div>
                <div className="text-xs text-muted-foreground">Attention</div>
              </div>
            </div>

            {/* Checks by category */}
            <div className="space-y-4">
              {Object.entries(checksByCategory).map(([category, checks]) => {
                const config = categoryConfig[category as keyof typeof categoryConfig];
                const Icon = config?.icon || Settings;
                const hasIssues = checks.some(c => c.status !== 'PASS');

                return (
                  <div key={category} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${config?.color || 'text-gray-500'}`} />
                      <span className="font-medium text-sm">{config?.label || category}</span>
                      {hasIssues && (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                    <div className="space-y-1">
                      {checks.map((check) => {
                        const statusCfg = statusConfig[check.status];
                        const StatusIcon = statusCfg.icon;

                        return (
                          <div 
                            key={check.id}
                            className={`flex items-center justify-between p-2 rounded ${statusCfg.bg}`}
                          >
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`h-4 w-4 ${statusCfg.color}`} />
                              <span className="text-sm">{check.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {check.reason && (
                                <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                                  {check.reason}
                                </span>
                              )}
                              {check.link && (
                                <Link to={check.link}>
                                  <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>
                Évalué {formatDistanceToNow(new Date(data.evaluatedAt), { addSuffix: true, locale: fr })}
              </span>
              {data.cached && (
                <Badge variant="outline" className="text-xs">
                  Caché
                </Badge>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
