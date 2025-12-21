import { useEffect } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Mail, 
  Smartphone, 
  Lock,
  MonitorSmartphone
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { SecurityScore } from "./SecurityCenter";

type SecurityStatus = 'ok' | 'warning' | 'error';
type CriticalityLevel = 'critical' | 'high' | 'medium' | 'low';

interface SecurityItem {
  id: string;
  label: string;
  description: string;
  whyImportant: string;
  status: SecurityStatus;
  icon: React.ReactNode;
  criticality: CriticalityLevel;
  responsible: 'app' | 'backend';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface SecurityAccountChecklistProps {
  isEmailVerified: boolean;
  isMFAEnabled: boolean;
  onScoreChange: (score: SecurityScore) => void;
}

// Criticality weights for score calculation
const CRITICALITY_WEIGHTS: Record<CriticalityLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

export function SecurityAccountChecklist({ 
  isEmailVerified, 
  isMFAEnabled,
  onScoreChange 
}: SecurityAccountChecklistProps) {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();

  const scrollToMFASection = () => {
    const mfaSection = document.getElementById('mfa-setup-section');
    if (mfaSection) {
      mfaSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const scrollToPasswordSection = () => {
    const passwordSection = document.querySelector('[aria-label="' + t('app:profile.password.title') + '"]');
    if (passwordSection) {
      passwordSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const items: SecurityItem[] = [
    {
      id: 'email',
      label: t('app:securityCenter.items.emailVerified.label'),
      description: t('app:securityCenter.items.emailVerified.description'),
      whyImportant: t('app:securityCenter.items.emailVerified.whyImportant'),
      status: isEmailVerified ? 'ok' : 'error',
      icon: <Mail className="h-4 w-4" />,
      criticality: 'critical',
      responsible: 'app',
    },
    {
      id: 'mfa',
      label: t('app:securityCenter.items.mfa.label'),
      description: t('app:securityCenter.items.mfa.description'),
      whyImportant: t('app:securityCenter.items.mfa.whyImportant'),
      status: isMFAEnabled ? 'ok' : 'warning',
      icon: <Smartphone className="h-4 w-4" />,
      criticality: 'high',
      responsible: 'app',
      action: !isMFAEnabled ? {
        label: t('app:securityCenter.enableMFA'),
        onClick: scrollToMFASection,
      } : undefined,
    },
    {
      id: 'password',
      label: t('app:securityCenter.items.passwordStrong.label'),
      description: t('app:securityCenter.items.passwordStrong.description'),
      whyImportant: t('app:securityCenter.items.passwordStrong.whyImportant'),
      status: 'ok', // Assumed OK since we enforce strong passwords
      icon: <Lock className="h-4 w-4" />,
      criticality: 'high',
      responsible: 'app',
      action: {
        label: t('app:securityCenter.changePassword'),
        onClick: scrollToPasswordSection,
      },
    },
    {
      id: 'sessions',
      label: t('app:securityCenter.items.sessions.label'),
      description: t('app:securityCenter.items.sessions.description'),
      whyImportant: t('app:securityCenter.items.sessions.whyImportant'),
      status: 'ok', // Informational
      icon: <MonitorSmartphone className="h-4 w-4" />,
      criticality: 'low',
      responsible: 'app',
      action: {
        label: t('app:securityCenter.comingSoon'),
        onClick: () => {},
      },
    },
  ];

  // Calculate weighted score
  useEffect(() => {
    let totalWeight = 0;
    let earnedWeight = 0;

    items.forEach(item => {
      const weight = CRITICALITY_WEIGHTS[item.criticality];
      totalWeight += weight;
      if (item.status === 'ok') {
        earnedWeight += weight;
      }
    });

    const percent = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    onScoreChange({
      score: earnedWeight,
      total: totalWeight,
      percent,
    });
  }, [isEmailVerified, isMFAEnabled]);

  const getStatusBadge = (status: SecurityStatus) => {
    switch (status) {
      case 'ok':
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t('app:securityCenter.status.ok')}
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="default" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t('app:securityCenter.status.warning')}
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
            <XCircle className="h-3 w-3" />
            {t('app:securityCenter.status.missing')}
          </Badge>
        );
    }
  };

  const getResponsibleBadge = (responsible: 'app' | 'backend') => {
    if (responsible === 'app') {
      return (
        <Badge variant="outline" className="text-xs">
          {t('app:securityCenter.inApp')}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        {t('app:securityCenter.inBackend')}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{t('app:securityCenter.accountTitle')}</CardTitle>
            <CardDescription className="text-xs">{t('app:securityCenter.accountDescription')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div 
            key={item.id}
            className="p-4 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors space-y-2"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`mt-0.5 ${
                  item.status === 'ok' 
                    ? 'text-green-600' 
                    : item.status === 'warning' 
                      ? 'text-amber-600' 
                      : 'text-destructive'
                }`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{item.label}</span>
                    {getStatusBadge(item.status)}
                    {getResponsibleBadge(item.responsible)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1 italic">
                    {t('app:securityCenter.whyImportant')}: {item.whyImportant}
                  </p>
                </div>
              </div>
              {item.action && item.id !== 'sessions' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="shrink-0 gap-1.5 text-xs"
                  onClick={item.action.onClick}
                >
                  {item.action.label}
                </Button>
              )}
              {item.id === 'sessions' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="shrink-0 gap-1.5 text-xs"
                  disabled
                >
                  {t('app:securityCenter.comingSoon')}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
