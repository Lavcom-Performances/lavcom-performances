import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, History, Shield } from 'lucide-react';
import { GuidedExportWizard } from '@/components/exports/GuidedExportWizard';
import { ExportJobsList } from '@/components/exports/ExportJobsList';
import { useExportJobs } from '@/hooks/useExportJobs';
import { useIsFeatureBlocked } from '@/hooks/usePlatformReadiness';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminExportsPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'fr' ? 'fr' : 'en';
  
  const { jobs, isLoading, isCreating, createExport, downloadExport, cancelExport } = useExportJobs('platform_admin');
  const { isBlocked, reason } = useIsFeatureBlocked('exports_enabled');

  const handleExport = async (params: { export_type: string; filters: Record<string, unknown>; site_id?: string }) => {
    await createExport(params);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {lang === 'fr' ? 'Exports Plateforme' : 'Platform Exports'}
          </h1>
          <p className="text-muted-foreground">
            {lang === 'fr'
              ? 'Exports de données administratives'
              : 'Administrative data exports'}
          </p>
        </div>
      </div>

      <Alert variant="default" className="bg-primary/5 border-primary/20">
        <Shield className="h-4 w-4" />
        <AlertTitle>
          {lang === 'fr' ? 'Exports sécurisés' : 'Secure exports'}
        </AlertTitle>
        <AlertDescription>
          {lang === 'fr'
            ? 'Toutes les exports sont journalisées et les téléchargements expirent après 15 minutes.'
            : 'All exports are logged and downloads expire after 15 minutes.'}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="new" className="space-y-6">
        <TabsList>
          <TabsTrigger value="new" className="gap-2">
            <FileDown className="h-4 w-4" />
            {lang === 'fr' ? 'Nouvel export' : 'New export'}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            {lang === 'fr' ? 'Historique' : 'History'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <GuidedExportWizard
            roleScope="platform_admin"
            onExport={handleExport}
            isCreating={isCreating}
            isBlocked={isBlocked}
            blockReason={reason}
          />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                {lang === 'fr' ? 'Historique des exports' : 'Export History'}
              </CardTitle>
              <CardDescription>
                {lang === 'fr'
                  ? 'Exports administratifs récents'
                  : 'Recent administrative exports'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExportJobsList
                jobs={jobs}
                isLoading={isLoading}
                onDownload={downloadExport}
                onCancel={cancelExport}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
