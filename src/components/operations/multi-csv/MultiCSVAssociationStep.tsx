import { useState } from "react";
import {
  File,
  Building2,
  Plus,
  AlertTriangle,
  CalendarDays,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileWithMeta } from "./types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Site {
  id: string;
  name: string;
  city?: string | null;
}

interface MultiCSVAssociationStepProps {
  files: FileWithMeta[];
  sites: Site[];
  onFileUpdate: (fileId: string, siteId: string, siteName: string) => void;
  onCreateSite: (name: string) => Promise<{ id: string; name: string } | null>;
  isCreatingSite: boolean;
}

export function MultiCSVAssociationStep({
  files,
  sites,
  onFileUpdate,
  onCreateSite,
  isCreatingSite,
}: MultiCSVAssociationStepProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [newSiteName, setNewSiteName] = useState("");

  const handleCreateSite = async () => {
    if (!newSiteName.trim() || !currentFileId) return;
    const result = await onCreateSite(newSiteName.trim());
    if (result) {
      onFileUpdate(currentFileId, result.id, result.name);
      setNewSiteName("");
      setCreateDialogOpen(false);
      setCurrentFileId(null);
    }
  };

  const openCreateDialog = (fileId: string) => {
    setCurrentFileId(fileId);
    setNewSiteName("");
    setCreateDialogOpen(true);
  };

  const formatDateRange = (minDate: Date | null, maxDate: Date | null) => {
    if (!minDate || !maxDate) return "Période inconnue";
    const start = format(minDate, "d MMM yyyy", { locale: fr });
    const end = format(maxDate, "d MMM yyyy", { locale: fr });
    if (start === end) return start;
    return `${start} → ${end}`;
  };

  const allFilesAssociated = files.every((f) => f.siteId !== null);
  const readyFiles = files.filter((f) => f.status === "ready");

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">
          {readyFiles.filter((f) => f.siteId).length} / {readyFiles.length}{" "}
          fichier{readyFiles.length > 1 ? "s" : ""} associé
          {readyFiles.filter((f) => f.siteId).length > 1 ? "s" : ""}
        </div>
        {allFilesAssociated && readyFiles.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Prêt pour l'import
          </div>
        )}
      </div>

      {/* Files list */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {files.map((fileItem) => (
          <div
            key={fileItem.id}
            className={cn(
              "p-4 rounded-xl border transition-all",
              fileItem.siteId
                ? "border-green-500/30 bg-green-500/5"
                : "border-border bg-card"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* File info */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <File className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm truncate">
                    {fileItem.file.name}
                  </p>
                  {fileItem.summary && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span>{fileItem.summary.validRows} lignes</span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDateRange(
                          fileItem.summary.minDate,
                          fileItem.summary.maxDate
                        )}
                      </span>
                      <span>
                        {fileItem.summary.totalAmount.toFixed(2)} €
                      </span>
                    </div>
                  )}
                  {fileItem.duplicateWarning && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      {fileItem.duplicateWarning}
                    </div>
                  )}
                </div>
              </div>

              {/* Site selector */}
              <div className="w-full sm:w-56 shrink-0">
                <Select
                  value={fileItem.siteId || ""}
                  onValueChange={(value) => {
                    if (value === "__create__") {
                      openCreateDialog(fileItem.id);
                    } else {
                      const site = sites.find((s) => s.id === value);
                      if (site) {
                        onFileUpdate(fileItem.id, site.id, site.name);
                      }
                    }
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "w-full",
                      !fileItem.siteId && "border-amber-500/50"
                    )}
                  >
                    <SelectValue placeholder="Choisir une laverie" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{site.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="__create__">
                      <div className="flex items-center gap-2 text-primary">
                        <Plus className="h-4 w-4" />
                        <span>Créer une laverie</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Site Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer une laverie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-site-name">Nom de la laverie *</Label>
              <Input
                id="new-site-name"
                placeholder="Ex: Laverie Centre-Ville"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Vous pourrez compléter l'adresse plus tard dans Paramètres.
              </p>
            </div>
            <Button
              onClick={handleCreateSite}
              className="w-full"
              disabled={!newSiteName.trim() || isCreatingSite}
            >
              {isCreatingSite ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
