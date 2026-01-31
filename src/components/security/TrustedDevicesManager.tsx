import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Smartphone, 
  Laptop, 
  Tablet, 
  Trash2, 
  Loader2,
  Shield,
  Clock,
  MapPin
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, Locale } from 'date-fns';
import { fr, enUS, es, de, it, nl } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TrustedDevice {
  id: string;
  device_id: string;
  device_name: string | null;
  trusted_until: string;
  last_used_at: string;
  created_at: string;
}

const locales: Record<string, Locale> = {
  fr, en: enUS, es, de, it, nl,
};

export function TrustedDevicesManager() {
  const { t, i18n } = useTranslation(['app', 'common']);
  const { user } = useAuth();
  const { deviceId } = useDeviceFingerprint();
  const { toast } = useToast();
  
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const locale = locales[i18n.language] || enUS;

  useEffect(() => {
    if (user) {
      fetchDevices();
    }
  }, [user]);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', user?.id)
        .order('last_used_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching trusted devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeDevice = async (device: TrustedDevice) => {
    try {
      setRemovingId(device.id);
      
      const { error } = await supabase.functions.invoke('remove-trusted-device', {
        body: { device_id: device.device_id },
      });

      if (error) throw error;

      setDevices(prev => prev.filter(d => d.id !== device.id));
      
      toast({
        title: t('app:securityCenter.trustedDevices.removed'),
        description: t('app:securityCenter.trustedDevices.removedDescription'),
      });
    } catch (error) {
      console.error('Error removing device:', error);
      toast({
        title: t('common:error'),
        description: t('app:securityCenter.trustedDevices.removeError'),
        variant: 'destructive',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const getDeviceIcon = (name: string | null) => {
    if (!name) return <Laptop className="h-5 w-5" />;
    const lowerName = name.toLowerCase();
    if (lowerName.includes('iphone') || lowerName.includes('android')) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (lowerName.includes('ipad') || lowerName.includes('tablet')) {
      return <Tablet className="h-5 w-5" />;
    }
    return <Laptop className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{t('app:securityCenter.trustedDevices.title')}</CardTitle>
            <CardDescription>{t('app:securityCenter.trustedDevices.description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>{t('app:securityCenter.trustedDevices.noDevices')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => {
              const isCurrentDevice = device.device_id === deviceId;
              const trustedUntil = new Date(device.trusted_until);
              const isExpired = trustedUntil < new Date();
              
              return (
                <div 
                  key={device.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    isCurrentDevice ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCurrentDevice ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {getDeviceIcon(device.device_name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {device.device_name || t('app:securityCenter.trustedDevices.unknownDevice')}
                        </span>
                        {isCurrentDevice && (
                          <Badge variant="secondary" className="text-xs">
                            {t('app:securityCenter.trustedDevices.currentDevice')}
                          </Badge>
                        )}
                        {isExpired && (
                          <Badge variant="destructive" className="text-xs">
                            {t('app:securityCenter.trustedDevices.expired')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('app:securityCenter.trustedDevices.lastUsed', {
                            time: formatDistanceToNow(new Date(device.last_used_at), { 
                              addSuffix: true,
                              locale,
                            }),
                          })}
                        </span>
                        {!isExpired && (
                          <span className="text-xs">
                            {t('app:securityCenter.trustedDevices.expiresOn', {
                              date: format(trustedUntil, 'PP', { locale }),
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {!isCurrentDevice && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          disabled={removingId === device.id}
                        >
                          {removingId === device.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t('app:securityCenter.trustedDevices.removeTitle')}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('app:securityCenter.trustedDevices.removeDescription', {
                              device: device.device_name || t('app:securityCenter.trustedDevices.unknownDevice'),
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeDevice(device)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('common:remove')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
