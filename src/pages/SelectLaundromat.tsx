import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, MapPin, ChevronRight, Plus, Settings, Loader2, Search, CheckCircle2, Home, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete } from "@/components/laundromat/AddressAutocomplete";
import { CityAutocomplete } from "@/components/simulation/CityAutocomplete";
import { LaundryEmptyState } from "@/components/laundromat/LaundryEmptyState";
import { useSites } from "@/hooks/useSites";
import { useDemoMode } from "@/hooks/useDemoMode";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MultiCSVImportWizard } from "@/components/operations/multi-csv/MultiCSVImportWizard";
import { SEOHead } from "@/components/seo/SEOHead";
export default function SelectLaundromat() {
  const navigate = useNavigate();
  const { sites, isLoading, createSite, fetchSites } = useSites();
  const { createDemoSite, isCreatingDemo } = useDemoMode();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMultiImportOpen, setIsMultiImportOpen] = useState(false);
  const [isLoadingSiret, setIsLoadingSiret] = useState(false);
  const [siretError, setSiretError] = useState<string | null>(null);
  const [siretSuccess, setSiretSuccess] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLaundromat, setNewLaundromat] = useState({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    siret: "",
    nafCode: "",
  });

  const handleSelectLaundromat = (siteId: string) => {
    // Store selected site ID in localStorage for now
    localStorage.setItem("selectedSiteId", siteId);
    navigate("/dashboard");
  };

  const handleSiretChange = async (value: string) => {
    // Only allow digits
    const cleanValue = value.replace(/\D/g, '').slice(0, 14);
    setNewLaundromat(prev => ({ ...prev, siret: cleanValue }));
    setSiretError(null);
    setSiretSuccess(false);

    // Auto-fetch when 14 digits are entered
    if (cleanValue.length === 14) {
      await fetchSiretData(cleanValue);
    }
  };

  const fetchSiretData = async (siret: string) => {
    setIsLoadingSiret(true);
    setSiretError(null);
    setSiretSuccess(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-from-siret?siret=${siret}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setSiretError(result.error || "Erreur lors de la récupération des données");
        return;
      }

      // Pre-fill the form with fetched data
      setNewLaundromat(prev => ({
        ...prev,
        name: result.trade_name || result.company_name || prev.name,
        address: result.address_line1 || prev.address,
        city: result.city || prev.city,
        postalCode: result.postal_code || prev.postalCode,
        nafCode: result.naf_code || prev.nafCode,
      }));
      
      setSiretSuccess(true);
      toast({
        title: "Données récupérées",
        description: "Les informations de l'entreprise ont été pré-remplies.",
      });
    } catch (error) {
      console.error("Error fetching SIRET data:", error);
      setSiretError("Service indisponible. Veuillez réessayer.");
    } finally {
      setIsLoadingSiret(false);
    }
  };

  const handleAddLaundromat = async () => {
    if (!newLaundromat.name || !newLaundromat.address || !newLaundromat.city) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le nom, l'adresse et la ville.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await createSite({
        name: newLaundromat.name,
        address: newLaundromat.address,
        city: newLaundromat.city,
        postal_code: newLaundromat.postalCode,
      });

      setNewLaundromat({ name: "", address: "", city: "", postalCode: "", siret: "", nafCode: "" });
      setIsDialogOpen(false);
      setSiretError(null);
      setSiretSuccess(false);
      
      toast({
        title: "Laverie ajoutée",
        description: `${newLaundromat.name} a été ajoutée avec succès.`,
      });

      // Refresh the sites list
      await fetchSites();
    } catch (error) {
      console.error("Error creating site:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la laverie. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Reset form when closing
      setNewLaundromat({ name: "", address: "", city: "", postalCode: "", siret: "", nafCode: "" });
      setSiretError(null);
      setSiretSuccess(false);
    }
  };

  const openAddDialog = () => {
    setIsDialogOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement de vos laveries...</p>
        </div>
      </div>
    );
  }

  // Empty state - no sites yet
  const hasSites = sites.length > 0;

  return (
    <>
      <SEOHead 
        title="Sélection de laverie"
        description="Sélectionnez ou ajoutez une laverie à gérer."
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
            <span className="hidden sm:inline">Accueil</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <ThemeToggle collapsed className="h-9 w-9" />
            <Button 
              variant="ghost" 
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => navigate("/company-settings")}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Entreprise</span>
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
              {hasSites ? `${sites.length} laverie${sites.length > 1 ? 's' : ''}` : "Nouvelle entreprise"}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
              {hasSites ? "Vos laveries" : "Bienvenue"}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
              {hasSites 
                ? "Sélectionnez une laverie pour accéder à son tableau de bord"
                : "Configurez votre première laverie pour commencer l'analyse de vos performances"
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
                  Ajouter une laverie
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsMultiImportOpen(true)} 
                  className="gap-2" 
                  size="lg"
                >
                  <Files className="h-4 w-4" />
                  Importer plusieurs CSV
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
                        Accéder
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
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle laverie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* SIRET Field */}
            <div className="space-y-2">
              <Label htmlFor="siret" className="flex items-center gap-2">
                N° SIRET
                <span className="text-xs text-muted-foreground font-normal">(optionnel - pré-remplit les champs)</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="siret"
                  placeholder="14 chiffres (ex: 12345678901234)"
                  value={newLaundromat.siret}
                  onChange={(e) => handleSiretChange(e.target.value)}
                  className={`pl-10 pr-10 ${siretError ? 'border-destructive' : siretSuccess ? 'border-green-500' : ''}`}
                  maxLength={14}
                />
                {isLoadingSiret && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {siretSuccess && !isLoadingSiret && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
              {siretError && (
                <p className="text-xs text-destructive">{siretError}</p>
              )}
              {newLaundromat.siret.length > 0 && newLaundromat.siret.length < 14 && (
                <p className="text-xs text-muted-foreground">
                  {14 - newLaundromat.siret.length} chiffres restants
                </p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="laundry-name">Nom de la laverie *</Label>
              <Input
                id="laundry-name"
                placeholder="Ex: Laverie Montmartre"
                value={newLaundromat.name}
                onChange={(e) => setNewLaundromat(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Address with autocomplete */}
            <div className="space-y-2">
              <Label>Adresse *</Label>
              <AddressAutocomplete
                value={newLaundromat.address}
                onSelect={(result) => {
                  setNewLaundromat(prev => ({
                    ...prev,
                    address: result.address,
                    city: result.city,
                    postalCode: result.postalCode,
                  }));
                }}
                onChange={(value) => setNewLaundromat(prev => ({ ...prev, address: value }))}
                placeholder="Rechercher une adresse..."
              />
            </div>

            {/* City with autocomplete */}
            <div className="space-y-2">
              <Label>Ville *</Label>
              <CityAutocomplete
                value={newLaundromat.city ? `${newLaundromat.city}${newLaundromat.postalCode ? ` (${newLaundromat.postalCode})` : ''}` : ''}
                onSelect={(result) => {
                  setNewLaundromat(prev => ({
                    ...prev,
                    city: result.city,
                    postalCode: result.postalCode,
                  }));
                }}
                placeholder="Rechercher une ville..."
              />
            </div>

            {/* Postal Code (read-only, filled by autocomplete) */}
            <div className="space-y-2">
              <Label htmlFor="postal-code">Code postal</Label>
              <Input
                id="postal-code"
                placeholder="Rempli automatiquement"
                value={newLaundromat.postalCode}
                onChange={(e) => setNewLaundromat(prev => ({ ...prev, postalCode: e.target.value }))}
                className="bg-muted/50"
              />
            </div>

            {/* NAF Code */}
            <div className="space-y-2">
              <Label htmlFor="naf-code" className="flex items-center gap-2">
                Code NAF
                <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Input
                id="naf-code"
                placeholder="Ex: 96.01A"
                value={newLaundromat.nafCode}
                onChange={(e) => setNewLaundromat(prev => ({ ...prev, nafCode: e.target.value }))}
              />
              {newLaundromat.nafCode && (
                <p className="text-xs text-muted-foreground">
                  Code APE/NAF de l'établissement
                </p>
              )}
            </div>

            <Button onClick={handleAddLaundromat} className="w-full" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                "Ajouter"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Multi CSV Import Wizard */}
      <MultiCSVImportWizard 
        open={isMultiImportOpen} 
        onOpenChange={setIsMultiImportOpen} 
      />
    </div>
    </>
  );
}
