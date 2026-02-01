/**
 * AuthErrorBanner - Standardized auth error display component
 * Provides consistent, accessible error messaging across all auth flows
 */

import { AlertTriangle, XCircle, Info, Copy, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AuthErrorCode, getAuthErrorInfo } from '@/lib/auth/authErrorCodes';
import { cn } from '@/lib/utils';

export interface AuthErrorBannerProps {
  errorCode: AuthErrorCode;
  /** Optional custom title override */
  title?: string;
  /** Optional custom message override */
  message?: string;
  /** Trace ID for support reference */
  traceId?: string;
  /** Callback when user clicks "Use recovery code" */
  onSwitchToRecovery?: () => void;
  /** Callback when user clicks "Contact support" */
  onContactSupport?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode for inline display */
  compact?: boolean;
}

export function AuthErrorBanner({
  errorCode,
  title,
  message,
  traceId,
  onSwitchToRecovery,
  onContactSupport,
  className,
  compact = false,
}: AuthErrorBannerProps) {
  const { t } = useTranslation(['app', 'common']);
  const { toast } = useToast();
  const errorInfo = getAuthErrorInfo(errorCode);

  // Get translated title and message
  const displayTitle = title || t(`app:${errorInfo.i18nKey}.title`, { defaultValue: t('common:error') });
  const displayMessage = message || t(`app:${errorInfo.i18nKey}.message`, { defaultValue: '' });
  const nextStep = t(`app:${errorInfo.i18nKey}.nextStep`, { defaultValue: '' });

  // Severity-based styling
  const severityStyles = {
    error: {
      container: 'bg-destructive/10 border-destructive/20 text-destructive',
      icon: XCircle,
    },
    warning: {
      container: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
      icon: AlertTriangle,
    },
    info: {
      container: 'bg-primary/10 border-primary/20 text-primary',
      icon: Info,
    },
  };

  const { container: containerClass, icon: Icon } = severityStyles[errorInfo.severity];

  const handleCopyTraceId = () => {
    if (traceId) {
      navigator.clipboard.writeText(traceId);
      toast({
        title: t('common:copied'),
        description: t('app:loginHelp.traceIdCopied'),
      });
    }
  };

  if (compact) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn(
          'flex items-center gap-2 p-3 rounded-lg border text-sm',
          containerClass,
          className
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{displayMessage || displayTitle}</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'p-4 rounded-lg border space-y-3',
        containerClass,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 space-y-1">
          <p className="font-medium">{displayTitle}</p>
          {displayMessage && (
            <p className="text-sm opacity-90">{displayMessage}</p>
          )}
          {nextStep && (
            <p className="text-sm font-medium mt-2">{nextStep}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {(errorInfo.suggestRecoveryCode || errorInfo.suggestContactSupport || traceId) && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-current/10">
          {errorInfo.suggestRecoveryCode && onSwitchToRecovery && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchToRecovery}
              className="text-xs"
            >
              {t('app:loginHelp.useRecoveryCode')}
            </Button>
          )}
          {errorInfo.suggestContactSupport && onContactSupport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onContactSupport}
              className="text-xs gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {t('common:contactSupport')}
            </Button>
          )}
          {traceId && (
            <button
              onClick={handleCopyTraceId}
              className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 ml-auto"
              title={t('app:loginHelp.copyTraceId')}
            >
              <Copy className="h-3 w-3" />
              <span className="font-mono">{traceId}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
