import { Alert, AlertDescription } from '@/components/ui/alert';
import { LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AllLaundromatsBanner() {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'fr' ? 'fr' : 'en';

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <LayoutGrid className="h-4 w-4 text-primary" />
      <AlertDescription className="text-foreground">
        <span className="font-medium">
          {lang === 'fr' ? 'Vue globale' : 'All laundromats view'}
        </span>
        {' — '}
        {lang === 'fr' 
          ? 'Données agrégées de toutes vos laveries actives.'
          : 'Aggregated data from all your active laundromats.'}
      </AlertDescription>
    </Alert>
  );
}
