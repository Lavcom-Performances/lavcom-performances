import { Upload, Plus, Play, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface LaundryEmptyStateProps {
  onAddLaundry: () => void;
  onViewDemo: () => void;
  isDemoLoading?: boolean;
}

export function LaundryEmptyState({ 
  onAddLaundry, 
  onViewDemo, 
  isDemoLoading = false 
}: LaundryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 text-center">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl mb-8">
        {/* Import CSV Card */}
        <Link to="/operations" className="group">
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6 h-full transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Upload className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-left">Importer un CSV</h3>
              <p className="text-sm text-muted-foreground text-left mb-4">
                Importez vos données LM Control en quelques clics
              </p>
              <div className="flex items-center text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                Commencer
                <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </div>
        </Link>

        {/* Add Laundry Card */}
        <button onClick={onAddLaundry} className="group text-left">
          <div className="relative overflow-hidden rounded-2xl border-2 border-border bg-card p-6 h-full transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-muted/50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Ajouter une laverie</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Créez votre première laverie manuellement
              </p>
              <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all">
                Créer
                <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Demo Section */}
      <div className="w-full max-w-xl">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-4 text-muted-foreground">ou découvrir</span>
          </div>
        </div>

        <button
          className="mt-6 w-full group flex items-center justify-center gap-3 px-6 py-4 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onViewDemo}
          disabled={isDemoLoading}
        >
          {isDemoLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">Création des données d'exemple...</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-foreground block">Voir une démo interactive</span>
                <span className="text-xs text-muted-foreground">Explorez avec des données exemple • 2 min</span>
              </div>
              <Play className="h-4 w-4 text-muted-foreground group-hover:text-primary ml-auto transition-colors" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
