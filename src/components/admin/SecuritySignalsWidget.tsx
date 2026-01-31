import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, AlertTriangle, Key, Globe, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SecuritySignals {
  riskyLoginsCount: number;
  otpFailuresCount: number;
  recoveryCodeUsageCount: number;
  topCountries: { country: string; count: number }[];
}

export function SecuritySignalsWidget() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['security-signals-24h'],
    queryFn: async (): Promise<SecuritySignals> => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Fetch all signals in parallel
      const [riskyLoginsResult, otpFailuresResult, recoveryCodesResult, countriesResult] = await Promise.all([
        // Risky logins in last 24h
        supabase
          .from('auth_login_events')
          .select('id', { count: 'exact', head: true })
          .in('risk_level', ['medium', 'high'])
          .gte('created_at', last24h.toISOString()),

        // OTP failures in last 24h
        supabase
          .from('auth_login_otps')
          .select('id', { count: 'exact', head: true })
          .is('verified_at', null)
          .gte('created_at', last24h.toISOString()),

        // Recovery code usage in last 24h
        supabase
          .from('recovery_codes')
          .select('id', { count: 'exact', head: true })
          .not('used_at', 'is', null)
          .gte('used_at', last24h.toISOString()),

        // Top countries from risky logins
        supabase
          .from('auth_login_events')
          .select('country')
          .in('risk_level', ['medium', 'high'])
          .gte('created_at', last24h.toISOString())
          .not('country', 'is', null),
      ]);

      // Aggregate countries
      const countryMap = new Map<string, number>();
      (countriesResult.data || []).forEach((row: { country: string | null }) => {
        if (row.country) {
          countryMap.set(row.country, (countryMap.get(row.country) || 0) + 1);
        }
      });

      const topCountries = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        riskyLoginsCount: riskyLoginsResult.count ?? 0,
        otpFailuresCount: otpFailuresResult.count ?? 0,
        recoveryCodeUsageCount: recoveryCodesResult.count ?? 0,
        topCountries,
      };
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const hasSignals = data && (
    data.riskyLoginsCount > 0 || 
    data.otpFailuresCount > 0 || 
    data.recoveryCodeUsageCount > 0
  );

  return (
    <Card className={hasSignals ? 'border-amber-500/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              hasSignals ? 'bg-amber-500/10' : 'bg-green-500/10'
            }`}>
              <ShieldAlert className={`h-5 w-5 ${hasSignals ? 'text-amber-600' : 'text-green-600'}`} />
            </div>
            <div>
              <CardTitle className="text-base">Signaux de Sécurité</CardTitle>
              <CardDescription>Dernières 24 heures (agrégé)</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Main metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg text-center ${
                data.riskyLoginsCount > 0 ? 'bg-amber-500/10' : 'bg-muted/50'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <AlertTriangle className={`h-5 w-5 ${
                    data.riskyLoginsCount > 0 ? 'text-amber-600' : 'text-muted-foreground'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  data.riskyLoginsCount > 0 ? 'text-amber-600' : 'text-muted-foreground'
                }`}>
                  {data.riskyLoginsCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Connexions à risque</p>
              </div>

              <div className={`p-4 rounded-lg text-center ${
                data.otpFailuresCount > 0 ? 'bg-orange-500/10' : 'bg-muted/50'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <Key className={`h-5 w-5 ${
                    data.otpFailuresCount > 0 ? 'text-orange-600' : 'text-muted-foreground'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  data.otpFailuresCount > 0 ? 'text-orange-600' : 'text-muted-foreground'
                }`}>
                  {data.otpFailuresCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Échecs OTP</p>
              </div>

              <div className={`p-4 rounded-lg text-center ${
                data.recoveryCodeUsageCount > 0 ? 'bg-blue-500/10' : 'bg-muted/50'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <Key className={`h-5 w-5 ${
                    data.recoveryCodeUsageCount > 0 ? 'text-blue-600' : 'text-muted-foreground'
                  }`} />
                </div>
                <div className={`text-2xl font-bold ${
                  data.recoveryCodeUsageCount > 0 ? 'text-blue-600' : 'text-muted-foreground'
                }`}>
                  {data.recoveryCodeUsageCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Codes recovery utilisés</p>
              </div>
            </div>

            {/* Top countries */}
            {data.topCountries.length > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Pays (connexions à risque)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.topCountries.map(({ country, count }) => (
                    <span 
                      key={country}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                    >
                      <span>{country}</span>
                      <span className="text-muted-foreground">({count})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!hasSignals && (
              <div className="text-center py-2 text-sm text-green-600">
                Aucun signal de sécurité suspect
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">Données non disponibles</p>
        )}
      </CardContent>
    </Card>
  );
}
