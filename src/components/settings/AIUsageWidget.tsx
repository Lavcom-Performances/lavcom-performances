import { Bot, Zap, DollarSign, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIUsage } from '@/hooks/useAIUsage';
import { cn } from '@/lib/utils';

export function AIUsageWidget() {
  const { 
    usage, 
    limits, 
    remainingRequests, 
    remainingCost,
    requestPercentage, 
    costPercentage,
    isLoading, 
    refetch 
  } = useAIUsage();

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 70) return 'text-amber-500';
    return 'text-primary';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-primary';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            Utilisation IA quotidienne
          </CardTitle>
          <CardDescription>
            Votre quota se réinitialise chaque jour à minuit
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          className="h-8 w-8"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Requests Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span>Requêtes</span>
            </div>
            <span className={cn('font-medium', getStatusColor(requestPercentage))}>
              {usage.request_count} / {limits.daily_request_limit}
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className={`h-full transition-all ${getProgressColor(requestPercentage)}`}
              style={{ width: `${requestPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {remainingRequests} requêtes restantes aujourd'hui
          </p>
        </div>

        {/* Cost Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>Coût estimé</span>
            </div>
            <span className={cn('font-medium', getStatusColor(costPercentage))}>
              {usage.estimated_cost_eur.toFixed(2)}€ / {limits.daily_cost_limit_eur}€
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className={`h-full transition-all ${getProgressColor(costPercentage)}`}
              style={{ width: `${costPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {remainingCost.toFixed(2)}€ restants aujourd'hui
          </p>
        </div>

        {/* Token Stats */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Tokens entrée</p>
              <p className="font-medium">{usage.tokens_in.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tokens sortie</p>
              <p className="font-medium">{usage.tokens_out.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Warning */}
        {(requestPercentage >= 80 || costPercentage >= 80) && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Vous approchez de votre limite quotidienne. 
              Le quota se réinitialise à minuit.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
