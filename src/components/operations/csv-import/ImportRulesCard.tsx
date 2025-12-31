import { Info } from "lucide-react";

export function ImportRulesCard() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Import en quelques secondes. Vos données apparaissent dans le tableau ci-dessous.</p>
        <p>Les doublons sont automatiquement ignorés (aucune donnée dupliquée n'est importée).</p>
        <p>Les montants sont affichés en euros.</p>
      </div>
    </div>
  );
}
