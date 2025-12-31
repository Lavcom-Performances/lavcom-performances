import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasOperations } from "@/hooks/useHasOperations";
import { DataLoadErrorState } from "@/components/ui/empty-state";

interface RequireOperationsDataProps {
  children: ReactNode;
}

// Routes that should NOT show the empty state wrapper
const EXCLUDED_ROUTES = [
  "/operations",
  "/getting-started",
  "/help",
  "/aide",
  "/admin",
  "/profile",
  "/security",
  "/settings",
  "/subscription",
  "/billing-history",
  "/laundromat-settings",
  "/roles-management",
  "/import-export",
];

function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function NoSiteSelected() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full scale-150" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
          <Building2 className="h-10 w-10 text-primary" />
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-display font-semibold text-foreground mb-4 max-w-md">
        Sélectionnez ou créez une laverie
      </h2>

      <p className="text-muted-foreground max-w-lg mb-8">
        Commencez par créer ou sélectionner une laverie, puis importez votre fichier CSV.
      </p>

      <Button
        size="lg"
        onClick={() => navigate("/operations")}
        className="gap-2 min-w-[200px]"
      >
        <Upload className="h-4 w-4" />
        Commencer l'import
      </Button>
    </motion.div>
  );
}

function EmptyStateContent() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full scale-150" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
          <Upload className="h-10 w-10 text-primary" />
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-display font-semibold text-foreground mb-4 max-w-md">
        Importez vos données pour activer l'analyse
      </h2>

      <ul className="text-sm text-muted-foreground max-w-md mb-8 space-y-2">
        <li className="flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span className="text-left">
            Vos indicateurs et graphiques se mettront à jour automatiquement.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span className="text-left">
            Les recommandations seront basées sur vos opérations (CB/ESP).
          </span>
        </li>
      </ul>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button
          size="lg"
          onClick={() => navigate("/operations")}
          className="gap-2 min-w-[200px]"
        >
          <Upload className="h-4 w-4" />
          Importer mon CSV
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={() => navigate("/getting-started")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          Voir comment ça marche
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Wrapper component that shows EmptyState when no operations exist
 * for the current site. Excludes specific routes like /operations.
 */
export function RequireOperationsData({ children }: RequireOperationsDataProps) {
  const location = useLocation();
  const { hasOperations, noSiteSelected, isLoading, error, refetch } = useHasOperations();

  // Don't apply wrapper to excluded routes
  if (isExcludedRoute(location.pathname)) {
    return <>{children}</>;
  }

  // Show skeleton during loading
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Show error state with retry
  if (error) {
    return <DataLoadErrorState onRetry={refetch} />;
  }

  // Show no site selected state
  if (noSiteSelected) {
    return <NoSiteSelected />;
  }

  // Show empty state if no operations
  if (!hasOperations) {
    return <EmptyStateContent />;
  }

  // User has data, render children
  return <>{children}</>;
}
