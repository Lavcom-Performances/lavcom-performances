/**
 * Security audit log component for auth-related events
 * Displays leaked password blocks, weak password blocks, and other auth security events
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  ShieldAlert, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Filter
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthSecurityLogs, AuthSecurityLog } from "@/hooks/useAuthSecurityLogs";
import { formatDistanceToNow, format } from "date-fns";
import { enUS, fr } from "date-fns/locale";

export function AuthSecurityAuditLog() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const [isOpen, setIsOpen] = useState(true);
  const [flowFilter, setFlowFilter] = useState<string>("all");
  
  const { logs, isLoading, refetch } = useAuthSecurityLogs({ limit: 100 });

  const dateLocale = i18n.language === 'fr' ? fr : enUS;

  // Filter logs by flow
  const filteredLogs = flowFilter === "all" 
    ? logs 
    : logs.filter(log => log.meta?.flow === flowFilter);

  // Get event type label
  const getEventTypeLabel = (code: string | null): string => {
    switch (code) {
      case 'LEAKED_PASSWORD_BLOCKED':
        return t('app:securityAudit.events.leakedPasswordBlocked');
      case 'WEAK_PASSWORD_BLOCKED':
        return t('app:securityAudit.events.weakPasswordBlocked');
      case 'SIGNUP_FAILED':
        return t('app:securityAudit.events.signupFailed');
      case 'PASSWORD_RESET_FAILED':
        return t('app:securityAudit.events.passwordResetFailed');
      default:
        return code || t('common:unknown');
    }
  };

  // Get flow label
  const getFlowLabel = (flow: string | undefined): string => {
    switch (flow) {
      case 'signup':
        return t('app:securityAudit.flows.signup');
      case 'reset_password':
        return t('app:securityAudit.flows.resetPassword');
      case 'change_password':
        return t('app:securityAudit.flows.changePassword');
      default:
        return flow || '-';
    }
  };

  // Get severity badge variant
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">{t('app:securityAudit.severity.critical')}</Badge>;
      case 'error':
        return <Badge variant="destructive">{t('app:securityAudit.severity.error')}</Badge>;
      case 'warn':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">{t('app:securityAudit.severity.warning')}</Badge>;
      case 'info':
      default:
        return <Badge variant="secondary">{t('app:securityAudit.severity.info')}</Badge>;
    }
  };

  // Get event icon
  const getEventIcon = (code: string | null) => {
    if (code?.includes('BLOCKED')) {
      return <ShieldAlert className="h-4 w-4 text-amber-500" />;
    }
    if (code?.includes('FAILED')) {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    return <ShieldCheck className="h-4 w-4 text-muted-foreground" />;
  };

  // Count events by type for summary
  const eventCounts = logs.reduce((acc, log) => {
    const code = log.code || 'OTHER';
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('app:securityAudit.title')}</CardTitle>
                <CardDescription>{t('app:securityAudit.description')}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Summary stats */}
            {logs.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2 border-b">
                {Object.entries(eventCounts).map(([code, count]) => (
                  <div 
                    key={code} 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm"
                  >
                    {getEventIcon(code)}
                    <span className="font-medium">{count}</span>
                    <span className="text-muted-foreground">{getEventTypeLabel(code)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={flowFilter} onValueChange={setFlowFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('app:securityAudit.filterByFlow')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('app:securityAudit.allFlows')}</SelectItem>
                  <SelectItem value="signup">{t('app:securityAudit.flows.signup')}</SelectItem>
                  <SelectItem value="reset_password">{t('app:securityAudit.flows.resetPassword')}</SelectItem>
                  <SelectItem value="change_password">{t('app:securityAudit.flows.changePassword')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Logs table */}
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('app:securityAudit.noEvents')}</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">{t('app:securityAudit.columns.timestamp')}</TableHead>
                      <TableHead>{t('app:securityAudit.columns.event')}</TableHead>
                      <TableHead className="w-[120px]">{t('app:securityAudit.columns.flow')}</TableHead>
                      <TableHead className="w-[80px]">{t('app:securityAudit.columns.severity')}</TableHead>
                      <TableHead className="w-[60px]">{t('app:securityAudit.columns.env')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <div>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}</div>
                              <div className="text-muted-foreground">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: dateLocale })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEventIcon(log.code)}
                            <span>{getEventTypeLabel(log.code)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getFlowLabel(log.meta?.flow)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getSeverityBadge(log.severity)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.env === 'prod' ? 'default' : 'secondary'}>
                            {log.env}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Footer note */}
            <p className="text-xs text-muted-foreground">
              {t('app:securityAudit.footerNote')}
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
