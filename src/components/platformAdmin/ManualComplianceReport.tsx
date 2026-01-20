import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  FileCheck, 
  Calendar,
  FileText,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ManualComplianceReportProps {
  onReportGenerated?: () => void;
}

export function ManualComplianceReport({ onReportGenerated }: ManualComplianceReportProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Veuillez sélectionner une période');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await supabase.functions.invoke('generate-compliance-report', {
        body: {
          date_from: startOfDay(dateRange.from).toISOString(),
          date_to: endOfDay(dateRange.to).toISOString(),
          report_type: 'manual',
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Échec de la génération');
      }

      const data = response.data;
      if (!data.success) {
        throw new Error(data.error || 'Échec de la génération');
      }

      toast.success(
        `Rapport généré: ${data.report.verified_valid} archive(s) valide(s) sur ${data.report.total_archives}`,
        { duration: 5000 }
      );

      onReportGenerated?.();
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur inattendue');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Générer un Rapport de Conformité
        </CardTitle>
        <CardDescription>
          Générez un rapport de vérification d'intégrité pour une période personnalisée
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground mb-1.5 block">
              <Calendar className="h-3.5 w-3.5 inline mr-1" />
              Période du rapport
            </label>
            <DateRangePicker
              dateRange={dateRange}
              onDateChange={setDateRange}
            />
          </div>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || !dateRange?.from || !dateRange?.to}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4" />
                Générer le rapport
              </>
            )}
          </Button>
        </div>

        {dateRange?.from && dateRange?.to && (
          <p className="text-xs text-muted-foreground mt-3">
            Période sélectionnée: {format(dateRange.from, 'dd MMM yyyy', { locale: fr })} → {format(dateRange.to, 'dd MMM yyyy', { locale: fr })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
