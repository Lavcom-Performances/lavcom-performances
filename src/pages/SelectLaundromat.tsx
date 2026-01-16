import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, MapPin, ChevronRight, Plus, Settings, Loader2, Home, Files, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { LaundryEmptyState } from "@/components/laundromat/LaundryEmptyState";
import { AddLaundromatDialog } from "@/components/laundromat/AddLaundromatDialog";
import { useSites } from "@/hooks/useSites";
import { useDemoMode } from "@/hooks/useDemoMode";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MultiCSVImportWizard } from "@/components/operations/multi-csv/MultiCSVImportWizard";
import { SEOHead } from "@/components/seo/SEOHead";
import { useLogout } from "@/hooks/useLogout";
import { useTranslation } from "react-i18next";
import { usePlatformRole } from "@/hooks/usePlatformRole";
import { getAppContext } from "@/lib/navigation/appContext";

interface LaundryFormData {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  siret: string;
  nafCode: string;
}

export default function SelectLaundromat() {
  const navigate = useNavigate();
  const { t } = useTranslation(['app', 'common']);
  const { logout } = useLogout();
  const { sites, isLoading, createSite, fetchSites } = useSites();
  const { createDemoSite, isCreatingDemo } = useDemoMode();
  const { isPlatformAdmin, isPlatformBilling, isLoading: platformRoleLoading } = usePlatformRole();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMultiImportOpen, setIsMultiImportOpen] = useState(false);

  // Platform admin bypass - ONLY redirect if context is "platform" (not explicitly "saas")
  useEffect(() => {
    if (platformRoleLoading) return;
    
    // Check the explicit context - if user chose "saas", let them stay
    const appContext = getAppContext();
    if (appContext === 'saas') {
      // User explicitly chose SaaS context, don't redirect
      return;
    }
    
    // Only redirect to admin if no context is set (default for platform users)
    if (isPlatformAdmin) {
      navigate("/admin", { replace: true });
      return;
    }
    if (isPlatformBilling) {
      navigate("/admin/sales", { replace: true });
    }
  }, [platformRoleLoading, isPlatformAdmin, isPlatformBilling, navigate]);

  const handleSelectLaundromat = (siteId: string) => {
    localStorage.setItem("selectedSiteId", siteId);
    navigate("/dashboard");
  };

  const handleAddLaundromat = async (formData: LaundryFormData) => {
    try {
      await createSite({
        name: formData.name,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
      });
      
      toast({
        title: t('app:addLaundromat.successTitle', 'Laverie ajoutée'),
        description: t('app:addLaundromat.successDescription', '{{name}} a été ajoutée avec succès.', { name: formData.name }),
      });

      await fetchSites();
    } catch (error) {
      console.error("Error creating site:", error);
      toast({
        title: t('app:addLaundromat.errorTitle', 'Erreur'),
        description: t('app:addLaundromat.errorDescription', 'Impossible d\'ajouter la laverie. Veuillez réessayer.'),
        variant: "destructive",
      });
      throw error;
    }
  };

  const openAddDialog = () => {
    setIsDialogOpen(true);
  };

  // Loading state (includes platform role check)
  if (isLoading || platformRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('app:selectLaundromat.loading')}</p>
        </div>
      </div>
    );
  }

  // Platform admin bypass - only show redirect message if actually redirecting
  const appContext = getAppContext();
  const shouldRedirectToAdmin = (isPlatformAdmin || isPlatformBilling) && appContext !== 'saas';
  
  if (shouldRedirectToAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirection vers l'administration...</p>
        </div>
      </div>
    );
  }

  // Empty state - no sites yet
  const hasSites = sites.length > 0;

  return (
    <>
      <SEOHead 
        title={t('app:selectLaundromat.title')}
        description={t('app:selectLaundromat.subtitle')}
        url="/select-laundromat"
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col relative">
      {/* Header */}
      <header className="w-full border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common:home')}</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <ThemeToggle collapsed className="h-9 w-9" />
            <Button 
              variant="ghost" 
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Entreprise</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="gap-2 text-muted-foreground hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('app:selectLaundromat.signOut')}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-2xl space-y-8 sm:space-y-10 animate-fade-in">
          {/* Hero Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
              <Building2 className="h-4 w-4" />
              {hasSites 
                ? t('app:selectLaundromat.laundryCount', { count: sites.length })
                : t('app:selectLaundromat.newBusiness')
              }
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
              {hasSites ? t('app:selectLaundromat.title') : t('app:selectLaundromat.welcome')}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
              {hasSites 
                ? t('app:selectLaundromat.subtitle')
                : t('app:selectLaundromat.firstTimeSubtitle')
              }
            </p>
          </div>

          {/* Empty state or Sites list */}
          {!hasSites ? (
            <LaundryEmptyState 
              onAddLaundry={openAddDialog} 
              onViewDemo={createDemoSite}
              onMultiImport={() => setIsMultiImportOpen(true)}
              isDemoLoading={isCreatingDemo}
            />
          ) : (
            <>
              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button onClick={openAddDialog} className="gap-2" size="lg">
                  <Plus className="h-4 w-4" />
                  {t('app:selectLaundromat.addLaundry')}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setIsMultiImportOpen(true)} 
                  className="gap-2" 
                  size="lg"
                >
                  <Files className="h-4 w-4" />
                  {t('app:selectLaundromat.importMultipleCsv')}
                </Button>
              </div>

              {/* Sites list */}
              <div className="space-y-3">
                {sites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => handleSelectLaundromat(site.id)}
                    className="w-full p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 text-left flex items-center justify-between group border-border bg-card hover:border-primary hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all shrink-0 bg-gradient-to-br from-muted to-muted/50 text-muted-foreground group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-base sm:text-lg truncate">{site.name}</h3>
                        {(site.address || site.city) && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {[site.address, site.city, site.postal_code].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors hidden sm:block">
                        {t('app:selectLaundromat.access')}
                      </span>
                      <ChevronRight className="h-5 w-5 transition-all text-muted-foreground group-hover:text-primary group-hover:translate-x-1" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Add Laundry Dialog */}
      <AddLaundromatDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAddLaundromat}
      />

      {/* Multi CSV Import Wizard */}
      <MultiCSVImportWizard 
        open={isMultiImportOpen} 
        onOpenChange={setIsMultiImportOpen} 
      />
    </div>
    </>
  );
}
