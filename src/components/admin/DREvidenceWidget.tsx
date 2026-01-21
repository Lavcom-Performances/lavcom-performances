import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  FolderPlus, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  ExternalLink,
  RefreshCw,
  Shield,
  PlayCircle,
  Loader2,
  X,
  Clock,
  Ban,
  FileJson,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DrillFolder {
  name: string;
  hasResults: boolean;
  hasBefore: boolean;
  hasIncident: boolean;
  hasAfter: boolean;
}

interface UploadingFile {
  name: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface DrillRun {
  id: string;
  actor_email: string | null;
  environment: string;
  site_name: string | null;
  started_at: string;
  ended_at: string | null;
  status: string;
  duration_ms: number | null;
  blocked_reason: string | null;
  overall_passed: boolean | null;
  rto_met: boolean | null;
  artifacts_paths: {
    results?: string;
    system_state?: string;
  } | null;
}

interface BlockedResponse {
  blocked: true;
  reason: string;
  code: string;
}

const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'application/json'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const COOLDOWN_HOURS = 24;

export function DREvidenceWidget() {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isRunningAutoDrill, setIsRunningAutoDrill] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is super_admin
  const { data: isSuperAdmin } = useQuery({
    queryKey: ['is-super-admin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: role } = await supabase
        .from('platform_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      return role?.role === 'super_admin';
    },
  });

  // Fetch recent drill runs
  const { data: recentRuns, refetch: refetchRuns } = useQuery({
    queryKey: ['dr-drill-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dr_drill_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as DrillRun[];
    },
    refetchInterval: 30000,
  });

  // Check cooldown status
  const cooldownStatus = useCallback(() => {
    if (!recentRuns || recentRuns.length === 0) return null;

    const completedRuns = recentRuns.filter(r => 
      r.status === 'completed' && r.environment === 'staging'
    );

    if (completedRuns.length === 0) return null;

    const lastRun = completedRuns[0];
    const lastRunTime = new Date(lastRun.started_at);
    const cooldownEnd = new Date(lastRunTime.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
    
    if (cooldownEnd > new Date()) {
      return {
        active: true,
        lastRun: lastRunTime,
        endsAt: cooldownEnd,
        minutesRemaining: Math.ceil((cooldownEnd.getTime() - Date.now()) / 60000),
      };
    }

    return { active: false, lastRun: lastRunTime };
  }, [recentRuns]);

  const { data: folders, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dr-evidence-folders'],
    queryFn: async () => {
      const { data: drFolder, error: listError } = await supabase
        .storage
        .from('dr-evidence')
        .list('dr', {
          sortBy: { column: 'name', order: 'desc' },
          limit: 10,
        });

      if (listError) throw listError;

      const foldersWithDetails: DrillFolder[] = [];
      
      for (const folder of drFolder || []) {
        if (!folder.name || folder.name === '.emptyFolderPlaceholder') continue;
        
        const { data: files } = await supabase
          .storage
          .from('dr-evidence')
          .list(`dr/${folder.name}`);

        const fileNames = files?.map(f => f.name) || [];
        
        foldersWithDetails.push({
          name: folder.name,
          hasResults: fileNames.some(f => f === 'results.json'),
          hasBefore: fileNames.some(f => f === 'before.png' || f === 'before.jpg'),
          hasIncident: fileNames.some(f => f === 'incident.png' || f === 'incident.jpg'),
          hasAfter: fileNames.some(f => f === 'after.png' || f === 'after.jpg'),
        });
      }

      return foldersWithDetails;
    },
    refetchInterval: 60000,
  });

  const latestDrill = folders?.[0];
  const isComplete = latestDrill?.hasResults && latestDrill?.hasBefore && 
                     latestDrill?.hasIncident && latestDrill?.hasAfter;
  const cooldown = cooldownStatus();
  const lastRun = recentRuns?.[0];

  const handleCreateFolder = async () => {
    if (!customDate || !/^\d{4}-\d{2}-\d{2}$/.test(customDate)) {
      toast.error('Format de date invalide (YYYY-MM-DD)');
      return;
    }

    setIsCreatingFolder(true);
    try {
      const placeholderContent = new Blob([''], { type: 'text/plain' });
      const folderPath = `dr/${customDate}/.placeholder`;

      const { error: uploadError } = await supabase
        .storage
        .from('dr-evidence')
        .upload(folderPath, placeholderContent, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('rpc_create_audit_log', {
          p_actor_id: user.id,
          p_action: 'DR_EVIDENCE_CREATE',
          p_target_table: 'storage.objects',
          p_target_id: null,
          p_metadata: {
            folder: `dr/${customDate}`,
            bucket: 'dr-evidence',
          },
        });
      }

      toast.success(`Dossier dr/${customDate} créé avec succès`);
      setSelectedFolder(customDate);
      refetch();
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Erreur lors de la création du dossier');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `Type non autorisé: ${file.type}. Utilisez PNG, JPEG ou JSON.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`;
    }
    return null;
  };

  const uploadFile = async (file: File, folderName: string): Promise<boolean> => {
    const validation = validateFile(file);
    if (validation) {
      setUploadingFiles(prev => prev.map(f => 
        f.name === file.name ? { ...f, status: 'error' as const, error: validation } : f
      ));
      return false;
    }

    const filePath = `dr/${folderName}/${file.name}`;

    try {
      const { error } = await supabase.storage
        .from('dr-evidence')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('rpc_create_audit_log', {
          p_actor_id: user.id,
          p_action: 'DR_EVIDENCE_UPLOAD',
          p_target_table: 'storage.objects',
          p_target_id: null,
          p_metadata: {
            file: filePath,
            bucket: 'dr-evidence',
            size: file.size,
            type: file.type,
          },
        });
      }

      setUploadingFiles(prev => prev.map(f => 
        f.name === file.name ? { ...f, status: 'success' as const, progress: 100 } : f
      ));
      return true;
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadingFiles(prev => prev.map(f => 
        f.name === file.name ? { ...f, status: 'error' as const, error: 'Upload échoué' } : f
      ));
      return false;
    }
  };

  const handleFiles = async (files: FileList) => {
    const targetFolder = selectedFolder || customDate;
    
    if (!targetFolder) {
      toast.error('Sélectionnez ou créez un dossier d\'abord');
      return;
    }

    const newUploadingFiles: UploadingFile[] = Array.from(files).map(f => ({
      name: f.name,
      progress: 0,
      status: 'uploading' as const,
    }));
    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    let successCount = 0;
    for (const file of Array.from(files)) {
      const success = await uploadFile(file, targetFolder);
      if (success) successCount++;
    }

    if (successCount > 0) {
      toast.success(`${successCount} fichier(s) uploadé(s) avec succès`);
      refetch();
    }

    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(f => f.status === 'uploading'));
    }, 3000);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [selectedFolder, customDate]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleRunAutoDrill = async () => {
    if (confirmationInput !== 'RUN DR DRILL') {
      toast.error('Tapez "RUN DR DRILL" pour confirmer');
      return;
    }

    setIsRunningAutoDrill(true);
    setBlockReason(null);

    try {
      const { data, error } = await supabase.functions.invoke('run-dr-drill', {
        body: { 
          environment: 'staging',
          confirmation: confirmationInput,
        },
      });

      if (error) throw error;

      // Check if blocked
      if (data?.blocked) {
        const blocked = data as BlockedResponse;
        setBlockReason(blocked.reason);
        toast.error(`Drill bloqué: ${blocked.reason}`);
        refetchRuns();
        return;
      }

      if (data?.success) {
        toast.success('Drill automatique terminé avec succès');
        setConfirmationInput('');
        refetch();
        refetchRuns();
      } else {
        toast.error(data?.message || 'Le drill a échoué');
        refetchRuns();
      }
    } catch (error) {
      console.error('Auto drill failed:', error);
      toast.error('Erreur lors du drill automatique');
    } finally {
      setIsRunningAutoDrill(false);
    }
  };

  const getStatusBadge = (run: DrillRun) => {
    switch (run.status) {
      case 'completed':
        return run.overall_passed ? (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" /> Réussi
          </Badge>
        ) : (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" /> Échec
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="secondary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> En cours
          </Badge>
        );
      case 'blocked':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            <Ban className="h-3 w-3 mr-1" /> Bloqué
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" /> Erreur
          </Badge>
        );
      default:
        return <Badge variant="secondary">{run.status}</Badge>;
    }
  };

  const getFileStatus = (hasFile: boolean, label: string) => (
    <div className="flex items-center gap-1.5 text-sm">
      {hasFile ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
      )}
      <span className={hasFile ? 'text-muted-foreground' : 'text-yellow-600'}>
        {label}
      </span>
    </div>
  );

  const canRunDrill = isSuperAdmin && !cooldown?.active && confirmationInput === 'RUN DR DRILL';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">DR Evidence</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => { refetch(); refetchRuns(); }}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a 
                href="https://github.com/your-repo/blob/main/docs/ops/dr-drill.md" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                Playbook
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
        <CardDescription>
          Disaster Recovery drill evidence storage
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Safety Status Banner */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
            <ShieldCheck className="h-4 w-4" />
            Safety Controls Active
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Production blocked • Demo sites only • 24h cooldown • Analytics tables only • Type-to-confirm
          </p>
        </div>

        {/* Automated Drill Button - Super Admin Only */}
        {isSuperAdmin && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  Drill Automatique (Staging)
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Simule un incident analytics, restaure, génère preuves
                </p>
              </div>
            </div>

            {/* Block Reason Display */}
            {blockReason && (
              <div className="bg-destructive/10 border border-destructive/30 rounded p-2 text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{blockReason}</span>
              </div>
            )}

            {/* Cooldown Warning */}
            {cooldown?.active && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-sm text-yellow-700 flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Cooldown actif. Prochain drill possible dans {cooldown.minutesRemaining} minutes
                  (dernier run: {formatDistanceToNow(cooldown.lastRun, { addSuffix: true, locale: fr })})
                </span>
              </div>
            )}

            {/* Type-to-confirm Input */}
            <div className="space-y-2">
              <Label htmlFor="confirm-drill" className="text-xs text-muted-foreground">
                Tapez <code className="bg-muted px-1 rounded">RUN DR DRILL</code> pour confirmer
              </Label>
              <div className="flex gap-2">
                <Input
                  id="confirm-drill"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder="RUN DR DRILL"
                  className="font-mono text-sm h-9"
                  disabled={isRunningAutoDrill || cooldown?.active}
                />
                <Button
                  onClick={handleRunAutoDrill}
                  disabled={!canRunDrill || isRunningAutoDrill}
                  variant={canRunDrill ? 'default' : 'outline'}
                  size="sm"
                >
                  {isRunningAutoDrill ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Exécution...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Lancer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Last Run Status */}
        {lastRun && (
          <div className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Dernier run</span>
              {getStatusBadge(lastRun)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Date:</span>{' '}
                {format(new Date(lastRun.started_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
              </div>
              <div>
                <span className="font-medium">Durée:</span>{' '}
                {lastRun.duration_ms ? `${Math.round(lastRun.duration_ms / 1000)}s` : '-'}
              </div>
              {lastRun.site_name && (
                <div>
                  <span className="font-medium">Site:</span> {lastRun.site_name}
                </div>
              )}
              {lastRun.rto_met !== null && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">RTO:</span>
                  {lastRun.rto_met ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  )}
                  {lastRun.rto_met ? 'Respecté' : 'Dépassé'}
                </div>
              )}
            </div>
            {lastRun.blocked_reason && (
              <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                <Ban className="h-3 w-3 inline mr-1" />
                {lastRun.blocked_reason}
              </div>
            )}
            {lastRun.artifacts_paths && (
              <div className="flex gap-2 text-xs">
                {lastRun.artifacts_paths.results && (
                  <div className="flex items-center gap-1 text-primary">
                    <FileJson className="h-3 w-3" />
                    results.json
                  </div>
                )}
                {lastRun.artifacts_paths.system_state && (
                  <div className="flex items-center gap-1 text-primary">
                    <FileJson className="h-3 w-3" />
                    system-state.json
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create Folder Section */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FolderPlus className="h-4 w-4" />
            Créer un dossier DR Evidence
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="dr-date" className="text-xs text-muted-foreground">
                Date du drill (YYYY-MM-DD)
              </Label>
              <Input
                id="dr-date"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="h-9"
              />
            </div>
            <Button 
              onClick={handleCreateFolder} 
              disabled={isCreatingFolder}
              size="sm"
            >
              {isCreatingFolder ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <FolderPlus className="h-4 w-4 mr-1" />
              )}
              Créer
            </Button>
          </div>
        </div>

        {/* Drag and Drop Upload Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".png,.jpg,.jpeg,.json"
            onChange={handleFileInput}
          />
          
          <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
          
          <p className="text-sm font-medium">
            Glissez-déposez vos fichiers ici
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ou{' '}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => fileInputRef.current?.click()}
            >
              parcourir
            </button>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            PNG, JPEG, JSON • Max 10MB • Dossier: <code className="bg-muted px-1 rounded">{selectedFolder || customDate}</code>
          </p>
        </div>

        {/* Upload Progress */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            {uploadingFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="flex items-center gap-2 text-sm">
                {file.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {file.status === 'success' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {file.status === 'error' && (
                  <X className="h-4 w-4 text-destructive" />
                )}
                <span className={file.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}>
                  {file.name}
                </span>
                {file.error && (
                  <span className="text-xs text-destructive">({file.error})</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Recent Drills */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Dossiers récents</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : folders && folders.length > 0 ? (
            <div className="space-y-2">
              {folders.slice(0, 5).map((folder) => {
                const isFolderComplete = folder.hasResults && folder.hasBefore && 
                                         folder.hasIncident && folder.hasAfter;
                const isSelected = selectedFolder === folder.name;
                return (
                  <div
                    key={folder.name}
                    onClick={() => setSelectedFolder(folder.name)}
                    className={`rounded-lg p-3 border cursor-pointer transition-colors ${
                      isSelected
                        ? 'ring-2 ring-primary border-primary'
                        : isFolderComplete 
                          ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40' 
                          : 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={isFolderComplete ? 'default' : 'secondary'}>
                          {folder.name}
                        </Badge>
                        {isFolderComplete ? (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complet
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Incomplet
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {getFileStatus(folder.hasResults, 'results.json')}
                      {getFileStatus(folder.hasBefore, 'before')}
                      {getFileStatus(folder.hasIncident, 'incident')}
                      {getFileStatus(folder.hasAfter, 'after')}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun dossier DR trouvé
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
