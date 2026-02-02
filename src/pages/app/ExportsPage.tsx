import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, History } from 'lucide-react';
import { GuidedExportWizard } from '@/components/exports/GuidedExportWizard';
import { ExportJobsList } from '@/components/exports/ExportJobsList';
import { useExportJobs } from '@/hooks/useExportJobs';
import { useIsFeatureBlocked } from '@/hooks/usePlatformReadiness';
import { useSites } from '@/hooks/useSites';
import { useActiveLaundromat } from '@/hooks/useActiveLaundromat';
import { ClosedLaundromatBanner } from '@/components/laundromat/ClosedLaundromatBanner';

export default function ExportsPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'fr' ? 'fr' : 'en';
  
  const { jobs, isLoading, isCreating, createExport, downloadExport, cancelExport } = useExportJobs('saas_user');
  const { isBlocked, reason } = useIsFeatureBlocked('exports_enabled');
  const { sites } = useSites();
  const { activeLaundromatId, activeLaundromat, isClosed, isAllLaundromats } = useActiveLaundromat();

  const handleExport = async (params: { export_type: string; filters: Record<string, unknown>; site_id?: string }) => {
    // Use active laundromat context if not "all"
    const siteId = !isAllLaundromats && activeLaundromatId ? activeLaundromatId : params.site_id;
    await createExport({ ...params, site_id: siteId });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Closed laundromat banner - mobile */}
      {isClosed && activeLaundromat && (
        <div className="lg:hidden">
          <ClosedLaundromatBanner siteName={activeLaundromat.name} />
        </div>
      )}
      
      <div>
        <h1 className="text-2xl font-bold">
          {lang === 'fr' ? 'Exports' : 'Exports'}
        </h1>
        <p className="text-muted-foreground">
          {lang === 'fr'
            ? 'Exportez vos données en quelques clics'
            : 'Export your data in a few clicks'}
          {!isAllLaundromats && activeLaundromat && (
            <span className="ml-2 text-primary">— {activeLaundromat.name}</span>
          )}
        </p>
      </div>

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
            roleScope="saas_user"
            onExport={handleExport}
            isCreating={isCreating}
            isBlocked={isBlocked}
            blockReason={reason}
            sites={sites?.map((s) => ({ id: s.id, name: s.name })) || []}
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
                  ? 'Vos exports récents et leur statut'
                  : 'Your recent exports and their status'}
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
