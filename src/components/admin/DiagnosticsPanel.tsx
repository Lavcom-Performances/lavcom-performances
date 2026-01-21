import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileJson, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface DiagnosticsBundle {
  id: string;
  created_at: string;
  actor_id: string;
  actor_email: string | null;
  site_id: string | null;
  date_from: string | null;
  date_to: string | null;
  file_path: string;
  file_size_bytes: number | null;
  bundle_summary: {
    events_count?: number;
    failed_crons_count?: number;
    missing_secrets?: number;
    blocker_secrets_missing?: number;
  } | null;
}

interface Site {
  id: string;
  name: string;
}

export function DiagnosticsPanel() {
  const queryClient = useQueryClient();
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Fetch sites for selector
  const { data: sites } = useQuery({
    queryKey: ['admin-sites-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .eq('is_demo', false)
        .order('name');
      if (error) throw error;
      return data as Site[];
    },
  });

  // Fetch recent bundles
  const { data: bundles, isLoading: bundlesLoading, refetch: refetchBundles } = useQuery({
    queryKey: ['diagnostics-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diagnostics_bundles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as DiagnosticsBundle[];
    },
  });

  // Collect diagnostics mutation
  const collectMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};
      if (selectedSiteId) body.site_id = selectedSiteId;
      if (dateFrom) body.date_from = dateFrom;
      if (dateTo) body.date_to = dateTo;

      const { data, error } = await supabase.functions.invoke('collect-diagnostics', {
        body,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Bundle de diagnostics créé', {
        description: `${data.summary?.events_count || 0} événements collectés`,
      });
      queryClient.invalidateQueries({ queryKey: ['diagnostics-bundles'] });
      
      // Auto-download
      if (data.download_url) {
        window.open(data.download_url, '_blank');
      }
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la collecte', {
        description: error.message,
      });
    },
  });

  // Download bundle
  const handleDownload = async (bundle: DiagnosticsBundle) => {
    try {
      const { data, error } = await supabase.storage
        .from('diagnostics-bundles')
        .createSignedUrl(bundle.file_path, 300);

      if (error) throw error;

      // Log download
      await supabase.rpc('rpc_create_audit_log', {
        p_actor_id: (await supabase.auth.getUser()).data.user?.id || '',
        p_action: 'DIAGNOSTICS_DOWNLOAD',
        p_target_table: 'diagnostics_bundles',
        p_target_id: bundle.id,
        p_metadata: { file_path: bundle.file_path },
      });

      window.open(data.signedUrl, '_blank');
      toast.success('Téléchargement démarré');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Diagnostics</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetchBundles()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Collectez un bundle de diagnostics pour le support technique
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="site-select">Site (optionnel)</Label>
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger id="site-select">
                <SelectValue placeholder="Tous les sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les sites</SelectItem>
                {sites?.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-from">Date début</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-to">Date fin</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Collect Button */}
        <Button
          onClick={() => collectMutation.mutate()}
          disabled={collectMutation.isPending}
          className="w-full"
        >
          {collectMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Collecte en cours...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Collecter les diagnostics
            </>
          )}
        </Button>

        {/* Runbook link */}
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <ExternalLink className="h-3 w-3 mr-1" />
          <a
            href="https://github.com/your-repo/docs/ops/incident-runbook.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Consulter le runbook d'incidents
          </a>
        </div>

        {/* Recent Bundles */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Bundles récents</h4>
          {bundlesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : bundles && bundles.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">
                        {bundle.file_path}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(bundle.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                      <span>•</span>
                      <span>{bundle.actor_email || bundle.actor_id.slice(0, 8)}</span>
                      {bundle.bundle_summary && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            {bundle.bundle_summary.events_count || 0} événements
                          </Badge>
                          {(bundle.bundle_summary.blocker_secrets_missing || 0) > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {bundle.bundle_summary.blocker_secrets_missing} secrets manquants
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(bundle)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun bundle créé
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
