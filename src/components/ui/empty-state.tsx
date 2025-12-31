import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, ExternalLink, AlertCircle, RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Main icon to display */
  icon: LucideIcon;
  /** Title - keep it action-oriented */
  title?: string;
  /** Bullet points describing the value (max 2) */
  benefits?: string[];
  /** Optional additional description */
  description?: string;
  /** Primary CTA label */
  primaryLabel?: string;
  /** Primary CTA route (defaults to /operations) */
  primaryRoute?: string;
  /** Show secondary CTA "Voir un exemple" */
  showSecondary?: boolean;
  /** Secondary CTA action (defaults to /getting-started) */
  secondaryRoute?: string;
  /** Secondary CTA label */
  secondaryLabel?: string;
  /** Additional className */
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title = "Importez vos données pour activer l'analyse",
  benefits = [
    "Votre tableau de bord s'actualise automatiquement après chaque import.",
    "Les recommandations s'appuient sur vos opérations (CB/ESP) et vos périodes d'activité.",
  ],
  description,
  primaryLabel = "Importer mon CSV",
  primaryRoute = "/operations",
  showSecondary = true,
  secondaryRoute = "/getting-started",
  secondaryLabel = "Voir un exemple de résultat",
  className,
}: EmptyStateProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center py-12 sm:py-16 px-6 text-center",
        className
      )}
    >
      {/* Icon container with gradient glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full scale-150" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
          <Icon className="h-10 w-10 text-primary" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-display font-semibold text-foreground mb-4 max-w-md">
        {title}
      </h2>

      {/* Description */}
      {description && (
        <p className="text-muted-foreground max-w-lg mb-4">
          {description}
        </p>
      )}

      {/* Benefits as bullet points */}
      {benefits.length > 0 && (
        <ul className="text-sm text-muted-foreground max-w-md mb-8 space-y-2">
          {benefits.slice(0, 2).map((benefit, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span className="text-left">{benefit}</span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button
          size="lg"
          onClick={() => navigate(primaryRoute)}
          className="gap-2 min-w-[200px]"
        >
          <Upload className="h-4 w-4" />
          {primaryLabel}
        </Button>

        {showSecondary && (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate(secondaryRoute)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            {secondaryLabel}
          </Button>
        )}
      </div>

      {/* Subtle hint */}
      <p className="text-xs text-muted-foreground/60 mt-6">
        Format supporté : export CSV de votre logiciel de caisse
      </p>
    </motion.div>
  );
}

// ============================================
// ErrorState Component
// ============================================

interface ErrorStateProps {
  /** Title of the error */
  title?: string;
  /** Description of the error */
  description?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Show admin link */
  showAdminLink?: boolean;
  /** Custom icon */
  icon?: LucideIcon;
  /** Additional className */
  className?: string;
}

export function ErrorState({
  title = "Impossible de charger les données",
  description = "Une erreur est survenue lors du chargement. Veuillez réessayer.",
  onRetry,
  showAdminLink = false,
  icon: Icon = AlertCircle,
  className,
}: ErrorStateProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center py-12 sm:py-16 px-6 text-center",
        className
      )}
    >
      {/* Icon container with error glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 blur-2xl bg-destructive/20 rounded-full scale-150" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/20 flex items-center justify-center">
          <Icon className="h-10 w-10 text-destructive" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-display font-semibold text-foreground mb-2 max-w-md">
        {title}
      </h2>

      {/* Description */}
      <p className="text-muted-foreground max-w-lg mb-6">
        {description}
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {onRetry && (
          <Button
            size="lg"
            onClick={onRetry}
            className="gap-2 min-w-[180px]"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        )}

        {showAdminLink && (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate("/admin/status")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            État du système
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// Pre-configured variants
// ============================================

// Pre-configured variants for common pages
export function DashboardEmptyState() {
  return (
    <EmptyState
      icon={Upload}
      benefits={[
        "Votre tableau de bord s'actualise automatiquement après chaque import.",
        "Visualisez vos revenus, transactions et tendances en temps réel.",
      ]}
    />
  );
}

export function RecommendationsEmptyState() {
  return (
    <EmptyState
      icon={Upload}
      title="Importez vos données pour générer des recommandations"
      benefits={[
        "Recevez des conseils personnalisés basés sur vos opérations réelles.",
        "Identifiez les leviers d'optimisation pour augmenter votre CA.",
      ]}
    />
  );
}

export function ProfitabilityEmptyState() {
  return (
    <EmptyState
      icon={Upload}
      title="Importez vos données pour analyser votre rentabilité"
      benefits={[
        "Identifiez les machines sous-performantes et le CA perdu.",
        "Optimisez vos créneaux horaires et vos tarifs.",
      ]}
    />
  );
}

export function ChartEmptyState() {
  return (
    <EmptyState
      icon={Upload}
      title="Importez vos données pour afficher ce graphique"
      benefits={[
        "Les visualisations se génèrent automatiquement à partir de vos imports.",
        "Comparez vos performances sur différentes périodes.",
      ]}
    />
  );
}

// Pre-configured error variants
export function DataLoadErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Erreur de chargement"
      description="Impossible de récupérer les données. Vérifiez votre connexion et réessayez."
      onRetry={onRetry}
    />
  );
}

export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Problème de connexion"
      description="Votre connexion semble instable. Veuillez vérifier votre réseau."
      onRetry={onRetry}
    />
  );
}
