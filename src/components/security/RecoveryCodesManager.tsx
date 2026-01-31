import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Key, 
  Download, 
  RefreshCw, 
  Loader2,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function RecoveryCodesManager() {
  const { t } = useTranslation(['app', 'common']);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [showCodesDialog, setShowCodesDialog] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [remainingCodes, setRemainingCodes] = useState<number | null>(null);

  const fetchRemainingCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('recovery_codes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .is('used_at', null);

      if (!error) {
        setRemainingCodes(data ? (data as any).length : 0);
      }
    } catch (err) {
      console.error('Error fetching remaining codes:', err);
    }
  };

  const generateCodes = async () => {
    try {
      setIsGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-recovery-codes', {
        body: {},
      });

      if (error) throw error;

      if (data?.codes) {
        setCodes(data.codes);
        setShowCodesDialog(true);
        setRemainingCodes(data.codes.length);
        
        toast({
          title: t('app:securityCenter.recoveryCodes.generated'),
          description: t('app:securityCenter.recoveryCodes.generatedDescription'),
        });
      }
    } catch (error) {
      console.error('Error generating recovery codes:', error);
      toast({
        title: t('common:error'),
        description: t('app:securityCenter.recoveryCodes.generateError'),
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyAllCodes = async () => {
    if (!codes) return;
    try {
      const allCodes = codes.join('\n');
      await navigator.clipboard.writeText(allCodes);
      toast({
        title: t('app:securityCenter.recoveryCodes.copiedAll'),
      });
    } catch (err) {
      console.error('Failed to copy all:', err);
    }
  };

  const downloadCodes = () => {
    if (!codes) return;
    
    const content = [
      t('app:securityCenter.recoveryCodes.downloadHeader'),
      '',
      ...codes.map((code, i) => `${i + 1}. ${code}`),
      '',
      t('app:securityCenter.recoveryCodes.downloadFooter'),
    ].join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lavcom-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: t('app:securityCenter.recoveryCodes.downloaded'),
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('app:securityCenter.recoveryCodes.title')}</CardTitle>
                <CardDescription>{t('app:securityCenter.recoveryCodes.description')}</CardDescription>
              </div>
            </div>
            {remainingCodes !== null && (
              <Badge 
                variant={remainingCodes <= 2 ? 'destructive' : 'secondary'}
                className="gap-1"
              >
                {remainingCodes <= 2 && <AlertTriangle className="h-3 w-3" />}
                {t('app:securityCenter.recoveryCodes.remaining', { count: remainingCodes })}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('app:securityCenter.recoveryCodes.explanation')}
          </p>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {t('app:securityCenter.recoveryCodes.generate')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('app:securityCenter.recoveryCodes.confirmTitle')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('app:securityCenter.recoveryCodes.confirmDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={generateCodes}>
                  {t('app:securityCenter.recoveryCodes.confirmGenerate')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Dialog open={showCodesDialog} onOpenChange={setShowCodesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-600" />
              {t('app:securityCenter.recoveryCodes.yourCodes')}
            </DialogTitle>
            <DialogDescription>
              {t('app:securityCenter.recoveryCodes.saveWarning')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">
                  {t('app:securityCenter.recoveryCodes.onceWarning')}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {codes?.map((code, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded font-mono text-sm"
                >
                  <span>{code}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyCode(code, index)}
                  >
                    {copiedIndex === index ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={copyAllCodes} className="gap-2">
              <Copy className="h-4 w-4" />
              {t('app:securityCenter.recoveryCodes.copyAll')}
            </Button>
            <Button onClick={downloadCodes} className="gap-2">
              <Download className="h-4 w-4" />
              {t('app:securityCenter.recoveryCodes.download')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
