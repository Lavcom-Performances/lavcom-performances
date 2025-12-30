import { Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, ArrowRight, Copy, Zap } from "lucide-react";
import { ImportResult } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CSVImportResultProps {
  result: ImportResult;
  onClose: () => void;
}

export function CSVImportResult({ result, onClose }: CSVImportResultProps) {
  return (
    <div className="space-y-4">
      <div className={`
        flex items-center gap-3 p-4 rounded-lg
        ${result.success 
          ? "bg-lavcom-green/10 text-lavcom-green-dark dark:text-lavcom-green" 
          : "bg-destructive/10 text-destructive"
        }
      `}>
        {result.success ? (
          <CheckCircle2 className="h-6 w-6 shrink-0" />
        ) : (
          <AlertCircle className="h-6 w-6 shrink-0" />
        )}
        <div className="flex-1">
          <p className="font-medium">
            {result.success ? "Import terminé avec succès !" : "Erreur lors de l'import"}
          </p>
          {result.success && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="default" className="bg-lavcom-green text-white">
                {result.imported} importées
              </Badge>
              {result.duplicates > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  <Copy className="h-3 w-3 mr-1" />
                  {result.duplicates} doublons ignorés
                </Badge>
              )}
              {result.ignored > 0 && (
                <Badge variant="outline" className="text-muted-foreground">
                  {result.ignored} lignes ignorées
                </Badge>
              )}
              {result.rechEspFixed !== undefined && result.rechEspFixed > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  <Zap className="h-3 w-3 mr-1" />
                  {result.rechEspFixed} rech ESP corrigés
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Détails :</p>
          <ul className="text-xs text-muted-foreground space-y-1 max-h-20 overflow-y-auto">
            {result.errors.slice(0, 5).map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
            {result.errors.length > 5 && (
              <li className="italic">... et {result.errors.length - 5} autres</li>
            )}
          </ul>
        </div>
      )}

      <div className="flex gap-3 justify-between items-center pt-2">
        <Link to="/dashboard">
          <Button variant="outline" size="sm" className="text-lavcom-green border-lavcom-green/30 hover:bg-lavcom-green/10">
            Voir le tableau de bord
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </Link>
        <Button onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  );
}
