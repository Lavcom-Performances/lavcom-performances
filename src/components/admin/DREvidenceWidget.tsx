import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  FolderPlus, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  FileJson,
  Image,
  ExternalLink,
  RefreshCw,
  Shield,
  PlayCircle,
  Loader2,
  X
} from 'lucide-react';
import { format } from 'date-fns';
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

const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'application/json'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DREvidenceWidget() {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isRunningAutoDrill, setIsRunningAutoDrill] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // Log the upload
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

    // Initialize uploading state
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

    // Clear completed uploads after 3 seconds
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
    setIsRunningAutoDrill(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-dr-drill', {
        body: { environment: 'staging' },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Drill automatique terminé avec succès');
        refetch();
      } else {
        toast.error(data?.message || 'Le drill a échoué');
      }
    } catch (error) {
      console.error('Auto drill failed:', error);
      toast.error('Erreur lors du drill automatique');
    } finally {
      setIsRunningAutoDrill(false);
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
              onClick={() => refetch()}
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
        {/* Automated Drill Button */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 font-medium">
                <PlayCircle className="h-4 w-4 text-primary" />
                Drill Automatique (Staging)
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Simule un incident, capture l'état système, génère results.json
              </p>
            </div>
            <Button
              onClick={handleRunAutoDrill}
              disabled={isRunningAutoDrill}
              variant="outline"
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
            PNG, JPEG, JSON • Max 10MB • Dossier cible: <code className="bg-muted px-1 rounded">{selectedFolder || customDate}</code>
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
            <span className="text-sm font-medium">Drills récents</span>
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
                      {isSelected && (
                        <Badge variant="outline" className="text-primary">
                          <Upload className="h-3 w-3 mr-1" />
                          Cible
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {getFileStatus(folder.hasBefore, 'before.png')}
                      {getFileStatus(folder.hasIncident, 'incident.png')}
                      {getFileStatus(folder.hasAfter, 'after.png')}
                      {getFileStatus(folder.hasResults, 'results.json')}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun drill enregistré</p>
              <p className="text-xs mt-1">Créez un dossier pour commencer</p>
            </div>
          )}
        </div>

        {/* Status Summary */}
        {latestDrill && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Dernier drill:</span>
              <span className="font-medium">{latestDrill.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Statut:</span>
              {isComplete ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Complet
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Evidence manquante
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
