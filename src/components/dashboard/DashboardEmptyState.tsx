import { Upload, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function DashboardEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-lavcom-green/10 flex items-center justify-center mb-6">
        <BarChart3 className="h-10 w-10 text-lavcom-green" />
      </div>
      
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Aucune donnée à afficher
      </h2>
      
      <p className="text-muted-foreground max-w-md mb-6">
        Importez vos premières opérations depuis la page Opérations pour voir apparaître vos statistiques et graphiques.
      </p>
      
      <Link to="/operations">
        <Button
          size="lg"
          className="bg-lavcom-green hover:bg-lavcom-green-dark text-white"
        >
          <Upload className="h-5 w-5 mr-2" />
          Importer mes données
        </Button>
      </Link>
      
      <p className="text-xs text-muted-foreground mt-4">
        Format supporté : export CSV de LM Control
      </p>
    </div>
  );
}
