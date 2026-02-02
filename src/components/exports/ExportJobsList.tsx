import { Download, XCircle, AlertCircle, Loader2, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { ExportJob } from '@/hooks/useExportJobs';

interface ExportJobsListProps {
  jobs: ExportJob[];
  isLoading: boolean;
  onDownload: (jobId: string) => void;
  onCancel: (jobId: string) => void;
}

const statusConfig = {
  queued: {
    label: 'En attente',
    labelEn: 'Queued',
    icon: Clock,
    variant: 'secondary' as const,
  },
  running: {
    label: 'En cours',
    labelEn: 'Running',
    icon: Loader2,
    variant: 'default' as const,
  },
  success: {
    label: 'Terminé',
    labelEn: 'Success',
    icon: CheckCircle,
    variant: 'default' as const,
  },
  failed: {
    label: 'Échoué',
    labelEn: 'Failed',
    icon: AlertCircle,
    variant: 'destructive' as const,
  },
  expired: {
    label: 'Expiré',
    labelEn: 'Expired',
    icon: AlertCircle,
    variant: 'outline' as const,
  },
  canceled: {
    label: 'Annulé',
    labelEn: 'Canceled',
    icon: XCircle,
    variant: 'outline' as const,
  },
};

const exportTypeLabels: Record<string, { fr: string; en: string }> = {
  transactions: { fr: 'Transactions', en: 'Transactions' },
  billing_summary: { fr: 'Résumé facturation', en: 'Billing Summary' },
  maintenance_report: { fr: 'Rapport maintenance', en: 'Maintenance Report' },
  site_usage: { fr: 'Utilisation site', en: 'Site Usage' },
  company_users: { fr: 'Utilisateurs', en: 'Users' },
  sites_list: { fr: 'Liste des sites', en: 'Sites List' },
  users_list: { fr: 'Liste utilisateurs', en: 'Users List' },
  global_activity: { fr: 'Activité globale', en: 'Global Activity' },
  admin_audit: { fr: 'Logs d\'audit', en: 'Audit Logs' },
  subscriptions_report: { fr: 'Abonnements', en: 'Subscriptions' },
};

export function ExportJobsList({
  jobs,
  isLoading,
  onDownload,
  onCancel,
}: ExportJobsListProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : undefined;
  const lang = i18n.language === 'fr' ? 'fr' : 'en';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{lang === 'fr' ? 'Aucun export pour le moment.' : 'No exports yet.'}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{lang === 'fr' ? 'Date' : 'Date'}</TableHead>
          <TableHead>{lang === 'fr' ? 'Type' : 'Type'}</TableHead>
          <TableHead>{lang === 'fr' ? 'Statut' : 'Status'}</TableHead>
          <TableHead>{lang === 'fr' ? 'Progression' : 'Progress'}</TableHead>
          <TableHead className="text-right">{lang === 'fr' ? 'Actions' : 'Actions'}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => {
          const config = statusConfig[job.status];
          const StatusIcon = config.icon;
          const typeLabel = exportTypeLabels[job.export_type]?.[lang] || job.export_type;
          const isExpired = job.expires_at && new Date(job.expires_at) < new Date();
          const canDownload = job.status === 'success' && !isExpired;
          const canCancel = job.status === 'queued';

          return (
            <TableRow key={job.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(job.created_at), 'dd MMM yyyy HH:mm', { locale })}
              </TableCell>
              <TableCell>{typeLabel}</TableCell>
              <TableCell>
                <Badge variant={config.variant} className="gap-1">
                  <StatusIcon
                    className={`h-3 w-3 ${job.status === 'running' ? 'animate-spin' : ''}`}
                  />
                  {lang === 'fr' ? config.label : config.labelEn}
                </Badge>
                {job.error_message && (
                  <p className="text-xs text-destructive mt-1 max-w-[200px] truncate">
                    {job.error_message}
                  </p>
                )}
              </TableCell>
              <TableCell className="w-[120px]">
                {(job.status === 'queued' || job.status === 'running') && (
                  <Progress value={job.progress} className="h-2" />
                )}
                {job.status === 'success' && (
                  <span className="text-sm text-muted-foreground">100%</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {canDownload && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownload(job.id)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {lang === 'fr' ? 'Télécharger' : 'Download'}
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCancel(job.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {isExpired && job.status === 'success' && (
                    <span className="text-xs text-muted-foreground">
                      {lang === 'fr' ? 'Expiré' : 'Expired'}
                    </span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
