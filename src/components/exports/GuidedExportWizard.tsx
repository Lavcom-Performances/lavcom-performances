import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronLeft, ChevronRight, FileDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportType {
  id: string;
  label: { fr: string; en: string };
  description: { fr: string; en: string };
}

const SAAS_EXPORT_TYPES: ExportType[] = [
  {
    id: 'transactions',
    label: { fr: 'Transactions', en: 'Transactions' },
    description: { fr: 'Exporter toutes les transactions', en: 'Export all transactions' },
  },
  {
    id: 'billing_summary',
    label: { fr: 'Résumé facturation', en: 'Billing Summary' },
    description: { fr: 'Récapitulatif des revenus', en: 'Revenue summary' },
  },
  {
    id: 'maintenance_report',
    label: { fr: 'Rapport maintenance', en: 'Maintenance Report' },
    description: { fr: 'État des machines et interventions', en: 'Machine status and interventions' },
  },
  {
    id: 'site_usage',
    label: { fr: 'Utilisation site', en: 'Site Usage' },
    description: { fr: 'Statistiques d\'utilisation par site', en: 'Usage statistics by site' },
  },
  {
    id: 'company_users',
    label: { fr: 'Utilisateurs', en: 'Users' },
    description: { fr: 'Liste des utilisateurs de l\'entreprise', en: 'Company users list' },
  },
];

const PLATFORM_EXPORT_TYPES: ExportType[] = [
  {
    id: 'sites_list',
    label: { fr: 'Liste des sites', en: 'Sites List' },
    description: { fr: 'Tous les sites de la plateforme', en: 'All platform sites' },
  },
  {
    id: 'users_list',
    label: { fr: 'Liste utilisateurs', en: 'Users List' },
    description: { fr: 'Tous les utilisateurs inscrits', en: 'All registered users' },
  },
  {
    id: 'global_activity',
    label: { fr: 'Activité globale', en: 'Global Activity' },
    description: { fr: 'Activité sur toute la plateforme', en: 'Platform-wide activity' },
  },
  {
    id: 'admin_audit',
    label: { fr: 'Logs d\'audit', en: 'Audit Logs' },
    description: { fr: 'Journal des actions administratives', en: 'Administrative action logs' },
  },
  {
    id: 'subscriptions_report',
    label: { fr: 'Abonnements', en: 'Subscriptions' },
    description: { fr: 'Rapport sur les abonnements', en: 'Subscriptions report' },
  },
];

interface GuidedExportWizardProps {
  roleScope: 'platform_admin' | 'saas_user';
  onExport: (params: { export_type: string; filters: Record<string, unknown>; site_id?: string }) => Promise<void>;
  isCreating: boolean;
  isBlocked?: boolean;
  blockReason?: string;
  sites?: Array<{ id: string; name: string }>;
}

export function GuidedExportWizard({
  roleScope,
  onExport,
  isCreating,
  isBlocked = false,
  blockReason,
  sites = [],
}: GuidedExportWizardProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'fr' ? 'fr' : 'en';
  
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string>('');
  const [siteId, setSiteId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const exportTypes = roleScope === 'platform_admin' ? PLATFORM_EXPORT_TYPES : SAAS_EXPORT_TYPES;
  const selectedTypeInfo = exportTypes.find((t) => t.id === selectedType);

  const canProceedStep1 = !!selectedType;
  const canProceedStep2 = true; // Filters are optional
  const canSubmit = canProceedStep1 && !isCreating && !isBlocked;

  const handleSubmit = async () => {
    const filters: Record<string, unknown> = {};
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;

    await onExport({
      export_type: selectedType,
      filters,
      site_id: siteId || undefined,
    });

    // Reset wizard
    setStep(1);
    setSelectedType('');
    setSiteId('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          {lang === 'fr' ? 'Nouvel export' : 'New Export'}
        </CardTitle>
        <CardDescription>
          {lang === 'fr'
            ? 'Suivez les étapes pour créer un export'
            : 'Follow the steps to create an export'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Blocked state */}
        {isBlocked && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            <p className="font-medium">
              {lang === 'fr' ? 'Exports désactivés' : 'Exports disabled'}
            </p>
            <p className="text-sm mt-1">{blockReason}</p>
          </div>
        )}

        {/* Step indicators */}
        <div className="flex items-center justify-center mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2',
                  s === step
                    ? 'bg-primary text-primary-foreground border-primary'
                    : s < step
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-1',
                    s < step ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Choose export type */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-medium">
              {lang === 'fr' ? 'Étape 1 : Choisir le type d\'export' : 'Step 1: Choose export type'}
            </h3>
            <RadioGroup value={selectedType} onValueChange={setSelectedType}>
              <div className="grid gap-3">
                {exportTypes.map((type) => (
                  <Label
                    key={type.id}
                    htmlFor={type.id}
                    className={cn(
                      'flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors',
                      selectedType === type.id && 'border-primary bg-primary/5'
                    )}
                  >
                    <RadioGroupItem value={type.id} id={type.id} />
                    <div className="flex-1">
                      <p className="font-medium">{type.label[lang]}</p>
                      <p className="text-sm text-muted-foreground">{type.description[lang]}</p>
                    </div>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Step 2: Filters */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-medium">
              {lang === 'fr' ? 'Étape 2 : Filtres (optionnel)' : 'Step 2: Filters (optional)'}
            </h3>

            {/* Site selection for SaaS */}
            {roleScope === 'saas_user' && sites.length > 0 && (
              <div className="space-y-2">
                <Label>{lang === 'fr' ? 'Site' : 'Site'}</Label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger>
                    <SelectValue placeholder={lang === 'fr' ? 'Tous les sites' : 'All sites'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{lang === 'fr' ? 'Tous les sites' : 'All sites'}</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{lang === 'fr' ? 'Date de début' : 'Start date'}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{lang === 'fr' ? 'Date de fin' : 'End date'}</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & submit */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium">
              {lang === 'fr' ? 'Étape 3 : Vérification' : 'Step 3: Review'}
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{lang === 'fr' ? 'Type' : 'Type'}</span>
                <span className="font-medium">{selectedTypeInfo?.label[lang]}</span>
              </div>
              {siteId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === 'fr' ? 'Site' : 'Site'}</span>
                  <span className="font-medium">
                    {sites.find((s) => s.id === siteId)?.name || siteId}
                  </span>
                </div>
              )}
              {dateFrom && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === 'fr' ? 'Depuis' : 'From'}</span>
                  <span className="font-medium">{dateFrom}</span>
                </div>
              )}
              {dateTo && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{lang === 'fr' ? 'Jusqu\'au' : 'To'}</span>
                  <span className="font-medium">{dateTo}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {lang === 'fr' ? 'Précédent' : 'Previous'}
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
            >
              {lang === 'fr' ? 'Suivant' : 'Next'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {lang === 'fr' ? 'Création...' : 'Creating...'}
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  {lang === 'fr' ? 'Lancer l\'export' : 'Start export'}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
