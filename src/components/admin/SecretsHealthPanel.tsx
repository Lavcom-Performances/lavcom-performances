import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  Copy, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { secretsManifest, generateSecretsChecklist } from '@/config/secretsManifest';

interface SecretStatus {
  name: string;
  status: 'PRESENT' | 'MISSING';
  purpose: string;
  usedBy: string[];
  severity: 'blocker' | 'warn';
  required: boolean;
  impactIfMissing: string;
}

interface SecretsHealthResponse {
  success: boolean;
  checkedAt: string;
  summary: {
    total: number;
    present: number;
    missingBlockers: number;
    missingWarnings: number;
    allBlockersPresent: boolean;
  };
  secrets: SecretStatus[];
}

export function SecretsHealthPanel() {
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['secrets-health'],
    queryFn: async (): Promise<SecretsHealthResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('secrets-health', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch secrets health');
      }

      return response.data;
    },
    staleTime: 60_000, // 1 minute
  });

  const handleCopyChecklist = () => {
    const checklist = generateSecretsChecklist(secretsManifest);
    navigator.clipboard.writeText(checklist);
    setCopied(true);
    toast.success('Checklist copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = (status: 'PRESENT' | 'MISSING', severity: 'blocker' | 'warn') => {
    if (status === 'PRESENT') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (severity === 'blocker') {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (status: 'PRESENT' | 'MISSING', severity: 'blocker' | 'warn') => {
    if (status === 'PRESENT') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">PRESENT</Badge>;
    }
    if (severity === 'blocker') {
      return <Badge variant="destructive">MISSING</Badge>;
    }
    return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">MISSING</Badge>;
  };

  const getOverallHealthIcon = () => {
    if (!data) return <Shield className="h-5 w-5 text-muted-foreground" />;
    if (data.summary.missingBlockers > 0) {
      return <ShieldX className="h-5 w-5 text-destructive" />;
    }
    if (data.summary.missingWarnings > 0) {
      return <ShieldAlert className="h-5 w-5 text-yellow-500" />;
    }
    return <ShieldCheck className="h-5 w-5 text-green-500" />;
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldX className="h-5 w-5 text-destructive" />
            Secrets Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              {error.message.includes('Forbidden') 
                ? 'Only super_admin users can view secrets health status.'
                : error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getOverallHealthIcon()}
            <div>
              <CardTitle>Secrets Health</CardTitle>
              <CardDescription>
                Platform secrets configuration status
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyChecklist}
              disabled={copied}
            >
              {copied ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy Checklist'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Summary */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Last checked: {new Date(data.checkedAt).toLocaleString()}
              </div>
              <Badge variant="outline">
                {data.summary.present}/{data.summary.total} configured
              </Badge>
            </div>

            {/* Blockers Alert */}
            {data.summary.missingBlockers > 0 && (
              <Alert variant="destructive" className="mb-4">
                <ShieldX className="h-4 w-4" />
                <AlertTitle>Critical: {data.summary.missingBlockers} required secret(s) missing</AlertTitle>
                <AlertDescription>
                  These secrets are required for core platform functionality.
                </AlertDescription>
              </Alert>
            )}

            {/* All Good */}
            {data.summary.allBlockersPresent && data.summary.missingWarnings === 0 && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">All secrets configured</AlertTitle>
                <AlertDescription className="text-green-700">
                  All required and optional secrets are present.
                </AlertDescription>
              </Alert>
            )}

            {/* Secrets List */}
            <div className="space-y-3">
              {/* Required Secrets */}
              <h4 className="text-sm font-medium text-muted-foreground">Required Secrets</h4>
              {data.secrets.filter(s => s.required).map(secret => (
                <SecretRow key={secret.name} secret={secret} />
              ))}

              {/* Optional Secrets */}
              <h4 className="text-sm font-medium text-muted-foreground mt-6">Optional Secrets</h4>
              {data.secrets.filter(s => !s.required).map(secret => (
                <SecretRow key={secret.name} secret={secret} />
              ))}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SecretRow({ secret }: { secret: SecretStatus }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className={`border rounded-lg p-3 transition-colors cursor-pointer hover:bg-muted/50 ${
        secret.status === 'MISSING' && secret.severity === 'blocker' 
          ? 'border-destructive/50 bg-destructive/5' 
          : secret.status === 'MISSING'
            ? 'border-yellow-200 bg-yellow-50/50'
            : 'border-border'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {secret.status === 'PRESENT' ? (
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
          ) : secret.severity === 'blocker' ? (
            <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          )}
          <div>
            <code className="text-sm font-mono font-medium">{secret.name}</code>
            <p className="text-xs text-muted-foreground mt-0.5">{secret.purpose}</p>
          </div>
        </div>
        {secret.status === 'PRESENT' ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            PRESENT
          </Badge>
        ) : secret.severity === 'blocker' ? (
          <Badge variant="destructive">MISSING</Badge>
        ) : (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            MISSING
          </Badge>
        )}
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/50 text-sm space-y-2">
          <div>
            <span className="text-muted-foreground">Used by: </span>
            <span className="text-xs">{secret.usedBy.join(', ')}</span>
          </div>
          {secret.status === 'MISSING' && (
            <div className="flex items-start gap-2 text-xs">
              <AlertTriangle className="h-3 w-3 mt-0.5 text-yellow-500 flex-shrink-0" />
              <span className="text-muted-foreground">{secret.impactIfMissing}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            Configure in: Lovable Cloud Secrets
          </div>
        </div>
      )}
    </div>
  );
}
