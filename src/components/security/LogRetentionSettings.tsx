import { useState } from "react";
import { 
  Clock, 
  Save,
  Loader2,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const MIN_RETENTION = 7;
const MAX_RETENTION = 365;
const DEFAULT_RETENTION = 90;

const PRESET_VALUES = [7, 30, 90, 180, 365];

export function LogRetentionSettings() {
  const { t } = useTranslation(['app', 'common']);
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  
  const [retentionDays, setRetentionDays] = useState(
    profile?.log_retention_days ?? DEFAULT_RETENTION
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSliderChange = (value: number[]) => {
    setRetentionDays(value[0]);
    setHasChanges(value[0] !== (profile?.log_retention_days ?? DEFAULT_RETENTION));
  };

  const handlePresetClick = (days: number) => {
    setRetentionDays(days);
    setHasChanges(days !== (profile?.log_retention_days ?? DEFAULT_RETENTION));
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    const { error } = await updateProfile({
      log_retention_days: retentionDays
    } as any);

    setIsLoading(false);

    if (error) {
      toast({
        title: t('common:error'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setHasChanges(false);
    toast({
      title: t('app:securityCenter.logRetention.saveSuccess'),
      description: t('app:securityCenter.logRetention.saveSuccessDescription', { days: retentionDays }),
    });
  };

  const formatDays = (days: number) => {
    if (days === 7) return t('app:securityCenter.logRetention.oneWeek');
    if (days === 30) return t('app:securityCenter.logRetention.oneMonth');
    if (days === 90) return t('app:securityCenter.logRetention.threeMonths');
    if (days === 180) return t('app:securityCenter.logRetention.sixMonths');
    if (days === 365) return t('app:securityCenter.logRetention.oneYear');
    return t('app:securityCenter.logRetention.days', { count: days });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{t('app:securityCenter.logRetention.title')}</CardTitle>
            <CardDescription className="text-xs">
              {t('app:securityCenter.logRetention.description')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current value display */}
        <div className="text-center py-4">
          <span className="text-4xl font-bold text-primary">{retentionDays}</span>
          <span className="text-lg text-muted-foreground ml-2">
            {t('app:securityCenter.logRetention.daysLabel')}
          </span>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDays(retentionDays)}
          </p>
        </div>

        {/* Slider */}
        <div className="px-2">
          <Slider
            value={[retentionDays]}
            onValueChange={handleSliderChange}
            min={MIN_RETENTION}
            max={MAX_RETENTION}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{MIN_RETENTION} {t('app:securityCenter.logRetention.daysLabel')}</span>
            <span>{MAX_RETENTION} {t('app:securityCenter.logRetention.daysLabel')}</span>
          </div>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2 justify-center">
          {PRESET_VALUES.map((days) => (
            <Button
              key={days}
              variant={retentionDays === days ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(days)}
              className="text-xs"
            >
              {formatDays(days)}
            </Button>
          ))}
        </div>

        {/* Info box */}
        <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            {t('app:securityCenter.logRetention.infoText')}
          </p>
        </div>

        {/* Save button */}
        {hasChanges && (
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common:saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t('common:save')}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
