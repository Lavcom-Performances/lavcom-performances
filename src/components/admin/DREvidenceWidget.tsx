import { useState } from 'react';
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
  FileJson,
  Image,
  ExternalLink,
  RefreshCw,
  Shield
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

export function DREvidenceWidget() {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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

      // For each folder, check what files exist
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
      // Create a placeholder file to create the folder
      const placeholderContent = new Blob([''], { type: 'text/plain' });
      const folderPath = `dr/${customDate}/.placeholder`;

      const { error: uploadError } = await supabase
        .storage
        .from('dr-evidence')
        .upload(folderPath, placeholderContent, { upsert: true });

      if (uploadError) throw uploadError;

      // Log the folder creation to audit_logs
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
      refetch();
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Erreur lors de la création du dossier');
    } finally {
      setIsCreatingFolder(false);
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
          <p className="text-xs text-muted-foreground">
            Chemin: <code className="bg-muted px-1 rounded">dr-evidence/dr/{customDate}/</code>
          </p>
        </div>

        {/* Required Files Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Fichiers requis:</p>
          <ul className="list-disc list-inside pl-2 space-y-0.5">
            <li><code>before.png</code> - Screenshot avant incident</li>
            <li><code>incident.png</code> - Screenshot après incident</li>
            <li><code>after.png</code> - Screenshot après restauration</li>
            <li><code>results.json</code> - Résultats structurés du drill</li>
          </ul>
        </div>

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
                return (
                  <div
                    key={folder.name}
                    className={`rounded-lg p-3 border ${
                      isFolderComplete 
                        ? 'bg-green-500/5 border-green-500/20' 
                        : 'bg-yellow-500/5 border-yellow-500/20'
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
