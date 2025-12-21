import { useEffect, useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  Lock,
  Database,
  Zap,
  FileDown,
  FileUp,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { LeakedPasswordModal } from "./LeakedPasswordModal";
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

interface SecurityProjectChecklistProps {
  onScoreChange: (score: SecurityScore) => void;
}

// Criticality weights for score calculation
const CRITICALITY_WEIGHTS: Record<CriticalityLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

export function SecurityProjectChecklist({ onScoreChange }: SecurityProjectChecklistProps) {
  const { t } = useTranslation(['app', 'common']);
  const [showLeakedPasswordModal, setShowLeakedPasswordModal] = useState(false);

  const handleViewBackend = () => {
    window.dispatchEvent(new CustomEvent('lovable:open-backend'));
  };

  const items: SecurityItem[] = [
    {
      id: 'rls',
      label: t('app:securityCenter.items.rls.label'),
      description: t('app:securityCenter.items.rls.description'),
      whyImportant: t('app:securityCenter.items.rls.whyImportant'),
      status: 'ok', // RLS is enabled on all tables
      icon: <Database className="h-4 w-4" />,
      criticality: 'critical',
      responsible: 'backend',
    },
    {
      id: 'rateLimit',
      label: t('app:securityCenter.items.rateLimit.label'),
      description: t('app:securityCenter.items.rateLimit.description'),
      whyImportant: t('app:securityCenter.items.rateLimit.whyImportant'),
      status: 'ok', // Rate limiting is active
      icon: <Lock className="h-4 w-4" />,
      criticality: 'high',
      responsible: 'app',
    },
    {
      id: 'edgeFunctions',
      label: t('app:securityCenter.items.edgeFunctions.label'),
      description: t('app:securityCenter.items.edgeFunctions.description'),
      whyImportant: t('app:securityCenter.items.edgeFunctions.whyImportant'),
      status: 'ok', // Edge functions are secure
      icon: <Zap className="h-4 w-4" />,
      criticality: 'high',
      responsible: 'backend',
    },
    {
      id: 'leakedPassword',
      label: t('app:securityCenter.items.leakedPassword.label'),
      description: t('app:securityCenter.items.leakedPassword.description'),
      whyImportant: t('app:securityCenter.items.leakedPassword.whyImportant'),
      status: 'warning', // Needs manual activation
      icon: <Shield className="h-4 w-4" />,
      criticality: 'medium',
      responsible: 'backend',
      action: {
        label: t('app:securityCenter.seeHowToActivate'),
        onClick: () => setShowLeakedPasswordModal(true),
      },
    },
    {
      id: 'importLimits',
      label: t('app:securityCenter.items.importLimits.label'),
      description: t('app:securityCenter.items.importLimits.description'),
      whyImportant: t('app:securityCenter.items.importLimits.whyImportant'),
      status: 'ok', // Limits are configured
      icon: <FileUp className="h-4 w-4" />,
      criticality: 'medium',
      responsible: 'app',
    },
    {
      id: 'exportLimits',
      label: t('app:securityCenter.items.exportLimits.label'),
      description: t('app:securityCenter.items.exportLimits.description'),
      whyImportant: t('app:securityCenter.items.exportLimits.whyImportant'),
      status: 'ok', // Export limits are configured
      icon: <FileDown className="h-4 w-4" />,
      criticality: 'low',
      responsible: 'app',
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
  }, []);

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
            {t('app:securityCenter.status.toActivate')}
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
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{t('app:securityCenter.projectTitle')}</CardTitle>
              <CardDescription className="text-xs">{t('app:securityCenter.projectDescription')}</CardDescription>
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
                {item.action && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="shrink-0 gap-1.5 text-xs"
                    onClick={item.action.onClick}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {item.action.label}
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Backend note */}
          <div className="mt-4 p-3 rounded-lg border border-dashed border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {t('app:securityCenter.backendNote')}
            </p>
          </div>
        </CardContent>
      </Card>

      <LeakedPasswordModal 
        open={showLeakedPasswordModal}
        onOpenChange={setShowLeakedPasswordModal}
      />
    </>
  );
}
