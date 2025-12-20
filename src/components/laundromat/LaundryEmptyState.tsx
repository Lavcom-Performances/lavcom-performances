import { Upload, Plus, Play, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface LaundryEmptyStateProps {
  onAddLaundry: () => void;
}

export function LaundryEmptyState({ onAddLaundry }: LaundryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
      {/* Icon */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
      </div>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-display font-semibold text-foreground mb-2">
        Bienvenue sur Lavcom Performances
      </h2>

      {/* Description */}
      <p className="text-muted-foreground max-w-md mb-8 text-sm sm:text-base">
        Commencez par importer vos données ou ajouter votre première laverie pour accéder à vos statistiques.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-none sm:w-auto">
        {/* Primary CTA: Import CSV */}
        <Link to="/operations" className="w-full sm:w-auto">
          <Button
            size="lg"
            className="w-full gap-2"
          >
            <Upload className="h-5 w-5" />
            Importer un CSV
          </Button>
        </Link>

        {/* Secondary CTA: Add Laundry */}
        <Button
          size="lg"
          variant="outline"
          onClick={onAddLaundry}
          className="w-full sm:w-auto gap-2"
        >
          <Plus className="h-5 w-5" />
          Ajouter une laverie
        </Button>
      </div>

      {/* Demo link - discrete (TAEX-089 placeholder) */}
      <button
        className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 group"
        onClick={() => {
          // TODO: TAEX-089 - Implement demo mode
          console.log("Demo mode - TAEX-089");
        }}
      >
        <Play className="h-3 w-3 group-hover:text-primary transition-colors" />
        Voir un exemple (2 min)
      </button>

      {/* Help text */}
      <p className="text-xs text-muted-foreground mt-8 max-w-md">
        Importez un export CSV de LM Control pour visualiser vos performances en quelques secondes.
      </p>
    </div>
  );
}
