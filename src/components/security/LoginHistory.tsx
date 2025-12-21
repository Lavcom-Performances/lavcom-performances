import { useState, useEffect } from "react";
import { 
  Monitor, 
  Smartphone, 
  Tablet,
  Chrome,
  Globe,
  Calendar,
  Clock,
  Loader2,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";

interface LoginLog {
  id: string;
  created_at: string;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  is_new_device: boolean | null;
}

const ITEMS_PER_PAGE = 10;
const RETENTION_DAYS = 90;

export function LoginHistory() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const { user } = useAuth();
  
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const dateLocale = i18n.language === 'fr' ? fr : enUS;

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Get total count
        const { count } = await supabase
          .from('login_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        setTotalCount(count || 0);

        // Fetch logs
        const { data, error } = await supabase
          .from('login_logs')
          .select('id, created_at, browser, os, device_type, is_new_device')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(showAll ? 50 : ITEMS_PER_PAGE);

        if (error) throw error;
        setLogs(data || []);
      } catch (error) {
        console.error('Error fetching login logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [user, showAll]);

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getBrowserIcon = (browser: string | null) => {
    if (browser?.toLowerCase().includes('chrome')) {
      return <Chrome className="h-3.5 w-3.5" />;
    }
    return <Globe className="h-3.5 w-3.5" />;
  };

  const formatLoginTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: format(date, 'dd MMM yyyy', { locale: dateLocale }),
      time: format(date, 'HH:mm', { locale: dateLocale }),
      relative: formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{t('app:securityCenter.loginHistory.title')}</CardTitle>
              <CardDescription className="text-xs">
                {t('app:securityCenter.loginHistory.description', { days: RETENTION_DAYS })}
              </CardDescription>
            </div>
          </div>
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalCount} {t('app:securityCenter.loginHistory.entries')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('app:securityCenter.loginHistory.noLogs')}</p>
          </div>
        ) : (
          <>
            <ScrollArea className={showAll ? "h-[400px]" : undefined}>
              <div className="space-y-2">
                {logs.map((log) => {
                  const timeInfo = formatLoginTime(log.created_at);
                  return (
                    <div 
                      key={log.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                    >
                      {/* Device icon */}
                      <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border shrink-0">
                        {getDeviceIcon(log.device_type)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {log.browser || t('app:securityCenter.loginHistory.unknownBrowser')}
                          </span>
                          {log.is_new_device && (
                            <Badge variant="default" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-xs">
                              <Sparkles className="h-3 w-3" />
                              {t('app:securityCenter.loginHistory.newDevice')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {getBrowserIcon(log.browser)}
                            {log.os || t('app:securityCenter.loginHistory.unknownOS')}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 capitalize">
                            {log.device_type || t('app:securityCenter.loginHistory.unknownDevice')}
                          </span>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {timeInfo.date}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {timeInfo.time} • {timeInfo.relative}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Show more button */}
            {totalCount > ITEMS_PER_PAGE && !showAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(true)}
                className="w-full mt-3 gap-1"
              >
                <ChevronDown className="h-4 w-4" />
                {t('app:securityCenter.loginHistory.showAll', { count: totalCount })}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
