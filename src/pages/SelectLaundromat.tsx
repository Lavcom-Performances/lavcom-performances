import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, MapPin, ChevronRight, Plus, Settings, Loader2, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete } from "@/components/laundromat/AddressAutocomplete";
import { CityAutocomplete } from "@/components/simulation/CityAutocomplete";

interface Laundromat {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  siret?: string;
  nafCode?: string;
}

// Mock data for V1
const initialLaundromats: Laundromat[] = [
  { id: "1", name: "Laverie Saint-Michel", address: "12 Rue Saint-Michel", city: "Paris", postalCode: "75006" },
  { id: "2", name: "Laverie Bastille", address: "45 Boulevard Voltaire", city: "Paris", postalCode: "75011" },
  { id: "3", name: "Laverie République", address: "8 Place de la République", city: "Paris", postalCode: "75003" },
];

export default function SelectLaundromat() {
  const navigate = useNavigate();
  const [laundromats, setLaundromats] = useState<Laundromat[]>(initialLaundromats);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingSiret, setIsLoadingSiret] = useState(false);
  const [siretError, setSiretError] = useState<string | null>(null);
  const [siretSuccess, setSiretSuccess] = useState(false);
  const [newLaundromat, setNewLaundromat] = useState({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    siret: "",
    nafCode: "",
  });

  const handleSelectLaundromat = (laundromatId: string) => {
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
      const { data, error } = await supabase.functions.invoke('fetch-from-siret', {
        body: null,
        headers: {},
      });

      // Use the GET method with query params
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

  const handleAddLaundromat = () => {
    if (!newLaundromat.name || !newLaundromat.address || !newLaundromat.city) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le nom, l'adresse et la ville.",
        variant: "destructive",
      });
      return;
    }

    const newEntry: Laundromat = {
      id: String(Date.now()),
      name: newLaundromat.name,
      address: newLaundromat.address,
      city: newLaundromat.city,
      postalCode: newLaundromat.postalCode,
      siret: newLaundromat.siret || undefined,
      nafCode: newLaundromat.nafCode || undefined,
    };

    setLaundromats(prev => [...prev, newEntry]);
    setNewLaundromat({ name: "", address: "", city: "", postalCode: "", siret: "", nafCode: "" });
    setIsDialogOpen(false);
    setSiretError(null);
    setSiretSuccess(false);
    
    toast({
      title: "Laverie ajoutée",
      description: `${newEntry.name} a été ajoutée avec succès.`,
    });
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl space-y-6 sm:space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            Sélectionnez une laverie
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Choisissez la laverie que vous souhaitez consulter
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter une laverie
              </Button>
            </DialogTrigger>
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

                <Button onClick={handleAddLaundromat} className="w-full">
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => navigate("/company-settings")}
          >
            <Settings className="h-4 w-4" />
            Paramètres entreprise
          </Button>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {laundromats.map((laundromat) => (
            <button
              key={laundromat.id}
              onClick={() => handleSelectLaundromat(laundromat.id)}
              className="w-full p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 text-left flex items-center justify-between group border-border bg-card hover:border-primary hover:shadow-lavcom"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-colors shrink-0 bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{laundromat.name}</h3>
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{laundromat.address}, {laundromat.city} {laundromat.postalCode}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 transition-colors shrink-0 text-muted-foreground group-hover:text-primary" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs sm:text-sm text-muted-foreground px-2">
          L'upload de fichiers CSV se fait depuis le menu <strong>Imports</strong> après avoir sélectionné une laverie.
        </p>
      </div>
    </div>
  );
}
