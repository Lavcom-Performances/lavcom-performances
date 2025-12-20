import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Trash2, FileText, Loader2, History, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useImportBatches, ImportBatch } from "@/hooks/useImportBatches";

interface ImportHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBatchDeleted?: () => void;
}

export function ImportHistoryDialog({ open, onOpenChange, onBatchDeleted }: ImportHistoryDialogProps) {
  const { toast } = useToast();
  const { batches, isLoading, deleteBatch, refetch } = useImportBatches();
  const [deleteConfirmBatch, setDeleteConfirmBatch] = useState<ImportBatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (batch: ImportBatch) => {
    setDeleteConfirmBatch(batch);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmBatch) return;

    setIsDeleting(true);
    try {
      await deleteBatch(deleteConfirmBatch.id);
      toast({
        title: "Import supprimé",
        description: `${deleteConfirmBatch.imported_rows} opérations ont été supprimées.`,
      });
      setDeleteConfirmBatch(null);
      onBatchDeleted?.();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer cet import.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-lavcom-green" />
              Historique des imports
            </DialogTitle>
            <DialogDescription>
              Gérez vos imports CSV. Supprimer un import retire toutes les opérations associées.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Aucun import pour le moment</p>
              </div>
            ) : (
              batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" title={batch.filename}>
                        {batch.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(batch.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {batch.site_name} • {batch.imported_rows} opérations
                        {batch.ignored_rows > 0 && (
                          <span className="text-amber-600"> • {batch.ignored_rows} ignorées</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(batch)}
                    className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Supprimer cet import"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmBatch} onOpenChange={(open) => !open && setDeleteConfirmBatch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer l'import "{deleteConfirmBatch?.filename}".
              <br /><br />
              <strong className="text-foreground">
                {deleteConfirmBatch?.imported_rows} opérations seront définitivement supprimées.
              </strong>
              <br /><br />
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
