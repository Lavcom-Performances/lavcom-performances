import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformRole } from "@/hooks/usePlatformRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Database, Download, HardDrive, Loader2, Play, ShieldAlert, Clock, CheckCircle2, XCircle, Copy, RotateCcw, StopCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BackupJob {
  id: string;
  triggered_by: string;
  trigger_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_size: number;
  error_message: string | null;
  created_at: string;
}

interface BackupFile {
  id: string;
  backup_job_id: string;
  file_type: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function generateConfirmationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "running":
      return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />En cours</Badge>;
    case "completed":
      return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Terminé</Badge>;
    case "failed":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Échoué</Badge>;
    case "cancelled":
      return <Badge variant="outline"><StopCircle className="h-3 w-3 mr-1" />Annulé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AdminBackupsPage() {
  const { isPlatformSuperAdmin, isLoading: roleLoading } = usePlatformRole();
  const queryClient = useQueryClient();
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["backup-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as BackupJob[];
    },
    enabled: isPlatformSuperAdmin,
    refetchInterval: 15000,
  });

  const { data: files } = useQuery({
    queryKey: ["backup-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BackupFile[];
    },
    enabled: isPlatformSuperAdmin,
  });

  const hasRunning = jobs?.some((j) => j.status === "running");

  // Poll every 3 minutes for running jobs to detect stale/failed ones
  useEffect(() => {
    if (hasRunning) {
      pollingRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["backup-jobs"] });
      }, 180_000); // 3 minutes
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [hasRunning, queryClient]);

  const triggerBackup = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const response = await supabase.functions.invoke("backup-system", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Backup déclenché", { description: `Job ID: ${data.job_id}` });
      queryClient.invalidateQueries({ queryKey: ["backup-jobs"] });
    },
    onError: (error) => {
      toast.error("Erreur", { description: error.message });
    },
  });

  const cancelBackup = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("backup_jobs")
        .update({
          status: "cancelled",
          error_message: "Annulé manuellement par l'administrateur",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId)
        .eq("status", "running");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Backup annulé");
      // Optimistically update the cache so UI reacts immediately
      queryClient.setQueryData<BackupJob[]>(["backup-jobs"], (old) =>
        old?.map((j) =>
          j.status === "running"
            ? { ...j, status: "cancelled", error_message: "Annulé manuellement par l'administrateur", completed_at: new Date().toISOString() }
            : j
        )
      );
      queryClient.invalidateQueries({ queryKey: ["backup-jobs"] });
    },
    onError: (error) => {
      toast.error("Erreur d'annulation", { description: error.message });
    },
  });

  const deleteBackupJob = useMutation({
    mutationFn: async (jobId: string) => {
      // Delete associated files from storage first
      const { data: jobFiles } = await supabase
        .from("backup_files")
        .select("file_path")
        .eq("backup_job_id", jobId);

      if (jobFiles && jobFiles.length > 0) {
        const paths = jobFiles.map((f) => f.file_path);
        await supabase.storage.from("backups").remove(paths);
      }

      // Delete files records
      await supabase.from("backup_files").delete().eq("backup_job_id", jobId);
      // Delete the job
      const { error } = await supabase.from("backup_jobs").delete().eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Backup supprimé");
      queryClient.invalidateQueries({ queryKey: ["backup-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["backup-files"] });
      setDeleteDialogOpen(false);
      setDeleteJobId(null);
      setDeleteConfirmInput("");
    },
    onError: (error) => {
      toast.error("Erreur de suppression", { description: error.message });
    },
  });

  const openDeleteDialog = useCallback((jobId: string) => {
    const code = generateConfirmationCode();
    setDeleteJobId(jobId);
    setExpectedCode(code);
    setDeleteConfirmCode(code);
    setDeleteConfirmInput("");
    setDeleteDialogOpen(true);
  }, []);

  const handleDownload = async (filePath: string) => {
    setDownloadingFile(filePath);
    try {
      const { data, error } = await supabase.storage
        .from("backups")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
      toast.success("Lien de téléchargement généré");
    } catch (err: unknown) {
      toast.error("Erreur de téléchargement", { description: (err as Error).message });
    } finally {
      setDownloadingFile(null);
    }
  };

  if (roleLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!isPlatformSuperAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-6 flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <p className="text-destructive font-medium">Accès réservé aux Super Administrateurs.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = jobs?.filter((j) => j.status === "completed").length || 0;
  const totalSize = jobs?.reduce((acc, j) => acc + (j.total_size || 0), 0) || 0;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HardDrive className="h-6 w-6" />
            Sauvegardes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sauvegardes complètes de la plateforme (base de données PostgreSQL)
          </p>
        </div>
        <div className="flex gap-2">
          {hasRunning && (
            <Button
              variant="destructive"
              onClick={() => {
                const runningJob = jobs?.find((j) => j.status === "running");
                if (runningJob) cancelBackup.mutate(runningJob.id);
              }}
              disabled={cancelBackup.isPending}
              className="gap-2"
            >
              {cancelBackup.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <StopCircle className="h-4 w-4" />
              )}
              Annuler le backup
            </Button>
          )}
          <Button
            onClick={() => triggerBackup.mutate()}
            disabled={triggerBackup.isPending || hasRunning}
            className="gap-2"
          >
            {triggerBackup.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {hasRunning ? "Backup en cours..." : "Lancer un backup"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Backups réussis</CardDescription>
            <CardTitle className="text-2xl">{completedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Espace total</CardDescription>
            <CardTitle className="text-2xl">{formatBytes(totalSize)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rétention</CardDescription>
            <CardTitle className="text-2xl">30 jours</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Running job status check info */}
      {hasRunning && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <div>
              <p className="text-sm font-medium">Backup en cours d'exécution</p>
              <p className="text-xs text-muted-foreground">
                Vérification automatique toutes les 3 minutes. Le statut se mettra à jour automatiquement.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Historique des sauvegardes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !jobs?.length ? (
            <p className="text-center py-8 text-muted-foreground">Aucune sauvegarde pour le moment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Fichiers</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const jobFiles = files?.filter((f) => f.backup_job_id === job.id) || [];
                  const duration = job.completed_at
                    ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
                    : null;

                  return (
                    <TableRow key={job.id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(job.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {job.trigger_type === "cron" ? "Automatique" : "Manuel"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={job.status} />
                          {job.status === "failed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              disabled={triggerBackup.isPending || hasRunning}
                              onClick={() => triggerBackup.mutate()}
                              title="Réessayer (nouvelle connexion)"
                            >
                              <RotateCcw className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatBytes(job.total_size)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {duration !== null ? `${duration}s` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{jobFiles.length}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {job.status === "completed" && jobFiles.length > 0 && (
                            <>
                              {jobFiles.map((file) => (
                                <Button
                                  key={file.id}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  disabled={downloadingFile === file.file_path}
                                  onClick={() => handleDownload(file.file_path)}
                                >
                                  {downloadingFile === file.file_path ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Download className="h-3 w-3" />
                                  )}
                                  {file.file_type === "database" ? "SQL" : "Storage"}
                                </Button>
                              ))}
                            </>
                          )}
                          {job.status === "failed" && job.error_message && (
                            <div className="flex items-center gap-1 max-w-[200px]">
                              <span className="text-xs text-destructive truncate" title={job.error_message}>
                                {job.error_message}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 shrink-0"
                                onClick={() => {
                                  navigator.clipboard.writeText(job.error_message!);
                                  toast.success("Message copié");
                                }}
                              >
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          )}
                          {(job.status === "failed" || job.status === "cancelled") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(job.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Supprimer
                            </Button>
                          )}
                          {job.status === "running" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-orange-600 hover:text-orange-700"
                              disabled={cancelBackup.isPending}
                              onClick={() => cancelBackup.mutate(job.id)}
                            >
                              <StopCircle className="h-3 w-3" />
                              Annuler
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette sauvegarde ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les fichiers associés seront supprimés du stockage.
              <br /><br />
              Pour confirmer, tapez le code suivant : <strong className="font-mono text-foreground">{deleteConfirmCode}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Tapez le code de confirmation"
            value={deleteConfirmInput}
            onChange={(e) => setDeleteConfirmInput(e.target.value.toUpperCase())}
            className="font-mono"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmInput(""); }}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmInput !== expectedCode || deleteBackupJob.isPending}
              onClick={() => {
                if (deleteJobId) deleteBackupJob.mutate(deleteJobId);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBackupJob.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}