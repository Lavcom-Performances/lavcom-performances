import { 
  Shield,
  CheckCircle2,
  ExternalLink,
  Copy
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "@/hooks/use-toast";

interface LeakedPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeakedPasswordModal({ open, onOpenChange }: LeakedPasswordModalProps) {
  const { t } = useTranslation(['app', 'common']);

  const steps = [
    {
      number: 1,
      title: t('app:securityCenter.leakedPassword.step1Title'),
      description: t('app:securityCenter.leakedPassword.step1Description'),
    },
    {
      number: 2,
      title: t('app:securityCenter.leakedPassword.step2Title'),
      description: t('app:securityCenter.leakedPassword.step2Description'),
    },
    {
      number: 3,
      title: t('app:securityCenter.leakedPassword.step3Title'),
      description: t('app:securityCenter.leakedPassword.step3Description'),
    },
    {
      number: 4,
      title: t('app:securityCenter.leakedPassword.step4Title'),
      description: t('app:securityCenter.leakedPassword.step4Description'),
    },
  ];

  const handleOpenBackend = () => {
    window.dispatchEvent(new CustomEvent('lovable:open-backend'));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle>{t('app:securityCenter.leakedPassword.modalTitle')}</DialogTitle>
              <DialogDescription>
                {t('app:securityCenter.leakedPassword.modalDescription')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info box */}
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {t('app:securityCenter.leakedPassword.infoBox')}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div 
                key={step.number}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  {step.number}
                </div>
                <div>
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Success indicator when done */}
          <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm font-medium">
                {t('app:securityCenter.leakedPassword.successIndicator')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t('common:close')}
          </Button>
          <Button 
            onClick={handleOpenBackend}
            className="flex-1 gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            {t('app:securityCenter.openBackend')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
