import { Upload, FileSpreadsheet, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUserPermissions } from "@/hooks/useCurrentUserPermissions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface OperationsEmptyStateProps {
  onImportClick: () => void;
}

export function OperationsEmptyState({ onImportClick }: OperationsEmptyStateProps) {
  const { canImport } = useCurrentUserPermissions();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-lavcom-green/10 flex items-center justify-center mb-6">
        <FileSpreadsheet className="h-10 w-10 text-lavcom-green" />
      </div>
      
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Aucune opération pour le moment
      </h2>
      
      <p className="text-muted-foreground max-w-md mb-6">
        Importez vos données depuis votre centrale de paiement (LM Control) pour commencer à analyser vos performances.
      </p>
      
      {canImport ? (
        <Button
          onClick={onImportClick}
          size="lg"
          className="bg-lavcom-green hover:bg-lavcom-green-dark text-white"
        >
          <Upload className="h-5 w-5 mr-2" />
          Importer mon premier fichier CSV
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              variant="outline"
              disabled
              className="opacity-50"
            >
              <Lock className="h-5 w-5 mr-2" />
              Import non autorisé
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Vous n'avez pas la permission d'importer des données
          </TooltipContent>
        </Tooltip>
      )}
      
      <p className="text-xs text-muted-foreground mt-4">
        Format supporté : export CSV de LM Control
      </p>
    </div>
  );
}
