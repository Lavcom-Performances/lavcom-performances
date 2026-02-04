/**
 * TAEX-301: DTS Feedback Banner
 * 
 * Non-accusatory, explanatory messages for data trust issues.
 * Always solution-oriented, never blaming the user.
 */

import { AlertCircle, Info, TrendingDown, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";

export type DTSMessageType = 
  | 'excluded_data'      // Some operations excluded from KPIs
  | 'low_dts'            // DTS < 60, recommendations disabled
  | 'underused_machine'  // Machine below average usage
  | 'import_warnings'    // Import had some issues
  | 'cash_step_mismatch' // Cash step configuration issue
  | 'high_invalid_rate'; // High percentage of invalid data

interface DTSFeedbackBannerProps {
  type: DTSMessageType;
  /** Additional context data */
  data?: {
    excludedCount?: number;
    excludedRevenue?: number;
    dtsScore?: number;
    machineName?: string;
    invalidRate?: number;
    topFlags?: string[];
  };
  className?: string;
}

/**
 * Get variant based on message type
 */
function getVariant(type: DTSMessageType): 'default' | 'destructive' {
  switch (type) {
    case 'low_dts':
    case 'high_invalid_rate':
      return 'destructive';
    default:
      return 'default';
  }
}

/**
 * Get icon based on message type
 */
function getIcon(type: DTSMessageType) {
  switch (type) {
    case 'excluded_data':
    case 'cash_step_mismatch':
      return Info;
    case 'low_dts':
    case 'high_invalid_rate':
      return AlertCircle;
    case 'underused_machine':
      return TrendingDown;
    case 'import_warnings':
      return AlertTriangle;
    default:
      return Info;
  }
}

export function DTSFeedbackBanner({ type, data = {}, className }: DTSFeedbackBannerProps) {
  const { t } = useTranslation('app');
  
  const Icon = getIcon(type);
  const variant = getVariant(type);
  
  const messages = getDTSMessages(type, data, t);
  
  return (
    <Alert variant={variant} className={className}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{messages.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{messages.description}</p>
        {messages.solution && (
          <p className="mt-2 text-sm opacity-80">{messages.solution}</p>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Get localized, non-accusatory messages for each DTS feedback type
 */
function getDTSMessages(
  type: DTSMessageType, 
  data: DTSFeedbackBannerProps['data'] = {},
  t: (key: string, options?: Record<string, unknown>) => string
): { title: string; description: string; solution?: string } {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  switch (type) {
    case 'excluded_data':
      return {
        title: t('dts.feedback.excludedData.title', { defaultValue: 'Données partiellement exclues' }),
        description: t('dts.feedback.excludedData.description', {
          defaultValue: `Certaines opérations (${data.excludedCount || 'quelques'}) ont été exclues des analyses car leurs montants ne correspondent pas aux pièces acceptées par votre centrale.`,
          count: data.excludedCount,
        }),
        solution: t('dts.feedback.excludedData.solution', {
          defaultValue: 'Cela n\'affecte pas votre encaissement réel. Vos revenus sont correctement enregistrés.',
        }),
      };

    case 'low_dts':
      return {
        title: t('dts.feedback.lowDts.title', { defaultValue: 'Fiabilité des données limitée' }),
        description: t('dts.feedback.lowDts.description', {
          defaultValue: `Les données de cette période présentent plusieurs incohérences techniques (score: ${data.dtsScore || 0}/100).`,
          score: data.dtsScore,
        }),
        solution: t('dts.feedback.lowDts.solution', {
          defaultValue: 'Les indicateurs sont affichés à titre informatif, sans recommandations automatiques.',
        }),
      };

    case 'underused_machine':
      return {
        title: t('dts.feedback.underusedMachine.title', { defaultValue: 'Machine sous-utilisée' }),
        description: t('dts.feedback.underusedMachine.description', {
          defaultValue: `${data.machineName || 'Cette machine'} fonctionne correctement mais est moins utilisée que la moyenne.`,
          machine: data.machineName,
        }),
        solution: t('dts.feedback.underusedMachine.solution', {
          defaultValue: 'L\'emplacement ou la visibilité peuvent influencer le choix des clients.',
        }),
      };

    case 'import_warnings':
      return {
        title: t('dts.feedback.importWarnings.title', { defaultValue: 'Import avec avertissements' }),
        description: t('dts.feedback.importWarnings.description', {
          defaultValue: `L'import a été traité avec ${data.excludedCount || 'quelques'} lignes exclues. Les données valides sont incluses dans vos analyses.`,
          count: data.excludedCount,
        }),
        solution: data.topFlags?.length 
          ? t('dts.feedback.importWarnings.solution', {
              defaultValue: `Principales raisons: ${data.topFlags.slice(0, 3).join(', ')}`,
              flags: data.topFlags.slice(0, 3).join(', '),
            })
          : undefined,
      };

    case 'cash_step_mismatch':
      return {
        title: t('dts.feedback.cashStepMismatch.title', { defaultValue: 'Configuration paiement' }),
        description: t('dts.feedback.cashStepMismatch.description', {
          defaultValue: 'Certains montants ne correspondent pas aux pas de paiement configurés pour votre centrale.',
        }),
        solution: t('dts.feedback.cashStepMismatch.solution', {
          defaultValue: 'Vérifiez la configuration des pièces acceptées dans les paramètres de votre site.',
        }),
      };

    case 'high_invalid_rate':
      return {
        title: t('dts.feedback.highInvalidRate.title', { defaultValue: 'Taux d\'anomalies élevé' }),
        description: t('dts.feedback.highInvalidRate.description', {
          defaultValue: `${(data.invalidRate || 0).toFixed(1)}% des opérations présentent des incohérences. ${data.excludedRevenue ? `CA exclu: ${formatCurrency(data.excludedRevenue)}` : ''}`,
          rate: data.invalidRate,
          revenue: data.excludedRevenue,
        }),
        solution: t('dts.feedback.highInvalidRate.solution', {
          defaultValue: 'Les données valides restent incluses dans les analyses principales.',
        }),
      };

    default:
      return {
        title: 'Information',
        description: 'Les données ont été traitées.',
      };
  }
}

export default DTSFeedbackBanner;
