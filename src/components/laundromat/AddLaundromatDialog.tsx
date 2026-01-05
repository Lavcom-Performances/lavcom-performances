import { useState, useCallback, useEffect } from "react";
import { Loader2, Search, CheckCircle2, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { AddressAutocomplete } from "@/components/laundromat/AddressAutocomplete";
import { CityAutocomplete } from "@/components/simulation/CityAutocomplete";
import { NafCodeSelect } from "@/components/laundromat/NafCodeSelect";
import { CountrySelect } from "@/components/laundromat/CountrySelect";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface LaundryFormData {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  siret: string;
  nafCode: string;
}

interface AddLaundromatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LaundryFormData) => Promise<void>;
}

const initialFormData: LaundryFormData = {
  name: "",
  address: "",
  city: "",
  postalCode: "",
  country: "FR",
  siret: "",
  nafCode: "",
};

export function AddLaundromatDialog({ open, onOpenChange, onSubmit }: AddLaundromatDialogProps) {
  const { t } = useTranslation(['app', 'errors']);
  const [formData, setFormData] = useState<LaundryFormData>(initialFormData);
  const [isLoadingSiret, setIsLoadingSiret] = useState(false);
  const [siretInfo, setSiretInfo] = useState<string | null>(null);
  const [siretSuccess, setSiretSuccess] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [addressLocked, setAddressLocked] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setSiretInfo(null);
      setSiretSuccess(false);
      setAddressLocked(false);
      setValidationErrors({});
    }
  }, [open]);

  const updateField = useCallback(<K extends keyof LaundryFormData>(field: K, value: LaundryFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when field is updated
    setValidationErrors(prev => ({ ...prev, [field]: false }));
  }, []);

  const handleSiretChange = async (value: string) => {
    // Only allow digits
    const cleanValue = value.replace(/\D/g, '').slice(0, 14);
    updateField('siret', cleanValue);
    setSiretInfo(null);
    setSiretSuccess(false);

    // Auto-fetch when 14 digits are entered
    if (cleanValue.length === 14) {
      await fetchSiretData(cleanValue);
    }
  };

  const fetchSiretData = async (siret: string) => {
    setIsLoadingSiret(true);
    setSiretInfo(null);
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
        // Non-blocking info message
        setSiretInfo(t('errors:siretLookup.unavailable', 'Service SIRET temporairement indisponible. Vous pouvez continuer manuellement.'));
        return;
      }

      // Pre-fill the form with fetched data
      setFormData(prev => ({
        ...prev,
        name: result.trade_name || result.company_name || prev.name,
        address: result.address_line1 || prev.address,
        city: result.city || prev.city,
        postalCode: result.postal_code || prev.postalCode,
        nafCode: result.naf_code || prev.nafCode,
      }));
      
      if (result.city && result.postal_code) {
        setAddressLocked(true);
      }
      
      setSiretSuccess(true);
      toast({
        title: t('app:addLaundromat.siretSuccess', 'Données récupérées'),
        description: t('app:addLaundromat.siretSuccessDescription', 'Les informations de l\'entreprise ont été pré-remplies.'),
      });
    } catch (error) {
      console.error("Error fetching SIRET data:", error);
      // Non-blocking info message
      setSiretInfo(t('errors:siretLookup.unavailable', 'Service SIRET temporairement indisponible. Vous pouvez continuer manuellement.'));
    } finally {
      setIsLoadingSiret(false);
    }
  };

  const handleAddressSelect = useCallback((result: { address: string; city: string; postalCode: string }) => {
    setFormData(prev => ({
      ...prev,
      address: result.address,
      city: result.city,
      postalCode: result.postalCode,
      country: "FR", // French address API
    }));
    setAddressLocked(true);
    setValidationErrors(prev => ({
      ...prev,
      address: false,
      city: false,
      postalCode: false,
    }));
  }, []);

  const handleCitySelect = useCallback((result: { city: string; postalCode: string }) => {
    setFormData(prev => ({
      ...prev,
      city: result.city,
      postalCode: result.postalCode,
    }));
    setValidationErrors(prev => ({
      ...prev,
      city: false,
      postalCode: false,
    }));
  }, []);

  const unlockAddress = () => {
    setAddressLocked(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, boolean> = {};
    
    if (!formData.name.trim()) {
      errors.name = true;
    }
    if (!formData.address.trim()) {
      errors.address = true;
    }
    if (!formData.city.trim()) {
      errors.city = true;
    }
    if (!formData.country) {
      errors.country = true;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: t('app:addLaundromat.validationError', 'Champs requis'),
        description: t('app:addLaundromat.validationErrorDescription', 'Veuillez remplir le nom, l\'adresse et la ville.'),
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating site:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('app:addLaundromat.title', 'Nouvelle laverie')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* SIRET Field - Optional, best-effort */}
          <div className="space-y-2">
            <Label htmlFor="siret" className="flex items-center gap-2">
              {t('app:addLaundromat.siretLabel', 'N° SIRET')}
              <span className="text-xs text-muted-foreground font-normal">
                ({t('app:addLaundromat.optional', 'optionnel')} - {t('app:addLaundromat.siretHelp', 'pré-remplit les champs')})
              </span>
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="siret"
                placeholder={t('app:addLaundromat.siretPlaceholder', '14 chiffres (ex: 12345678901234)')}
                value={formData.siret}
                onChange={(e) => handleSiretChange(e.target.value)}
                className={cn("pl-10 pr-10", siretSuccess && "border-green-500")}
                maxLength={14}
              />
              {isLoadingSiret && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {siretSuccess && !isLoadingSiret && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {/* Non-blocking info message */}
            {siretInfo && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{siretInfo}</span>
              </div>
            )}
            {formData.siret.length > 0 && formData.siret.length < 14 && (
              <p className="text-xs text-muted-foreground">
                {14 - formData.siret.length} {t('app:addLaundromat.digitsRemaining', 'chiffres restants')}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="laundry-name">
              {t('app:addLaundromat.nameLabel', 'Nom de la laverie')} *
            </Label>
            <Input
              id="laundry-name"
              placeholder={t('app:addLaundromat.namePlaceholder', 'Ex: Laverie Montmartre')}
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={cn(validationErrors.name && "border-destructive")}
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label>{t('app:addLaundromat.countryLabel', 'Pays')} *</Label>
            <CountrySelect
              value={formData.country}
              onChange={(value) => updateField('country', value)}
              disabled={addressLocked}
              hasError={validationErrors.country}
            />
            {addressLocked && (
              <button
                type="button"
                onClick={unlockAddress}
                className="text-xs text-primary hover:underline"
              >
                {t('app:addLaundromat.changeAddress', 'Modifier l\'adresse')}
              </button>
            )}
          </div>

          {/* Address with autocomplete */}
          <div className="space-y-2">
            <Label>{t('app:addLaundromat.addressLabel', 'Adresse')} *</Label>
            <AddressAutocomplete
              value={formData.address}
              onSelect={handleAddressSelect}
              onChange={(value) => updateField('address', value)}
              placeholder={t('app:addLaundromat.addressPlaceholder', 'Rechercher une adresse...')}
              disabled={addressLocked}
              className={cn(validationErrors.address && "[&_input]:border-destructive")}
            />
            {addressLocked && (
              <p className="text-xs text-muted-foreground">
                {t('app:addLaundromat.addressLocked', 'Adresse verrouillée après sélection.')}
                {' '}
                <button
                  type="button"
                  onClick={unlockAddress}
                  className="text-primary hover:underline"
                >
                  {t('app:addLaundromat.unlock', 'Déverrouiller')}
                </button>
              </p>
            )}
          </div>

          {/* City with autocomplete - Mandatory selection */}
          <div className="space-y-2">
            <Label>{t('app:addLaundromat.cityLabel', 'Ville')} *</Label>
            <CityAutocomplete
              value={formData.city ? `${formData.city}${formData.postalCode ? ` (${formData.postalCode})` : ''}` : ''}
              onSelect={handleCitySelect}
              placeholder={t('app:addLaundromat.cityPlaceholder', 'Rechercher une ville...')}
              country={formData.country}
              hasError={validationErrors.city}
            />
            <p className="text-xs text-muted-foreground">
              {t('app:addLaundromat.cityHelp', 'Sélectionnez une ville dans la liste de suggestions.')}
            </p>
          </div>

          {/* Postal Code - Auto-filled, readonly */}
          <div className="space-y-2">
            <Label htmlFor="postal-code">{t('app:addLaundromat.postalCodeLabel', 'Code postal')}</Label>
            <Input
              id="postal-code"
              placeholder={t('app:addLaundromat.postalCodePlaceholder', 'Rempli automatiquement')}
              value={formData.postalCode}
              readOnly
              className="bg-muted/50"
            />
          </div>

          {/* NAF Code - Searchable dropdown */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {t('app:addLaundromat.nafLabel', 'Code NAF')}
              <span className="text-xs text-muted-foreground font-normal">
                ({t('app:addLaundromat.optional', 'optionnel')})
              </span>
            </Label>
            <NafCodeSelect
              value={formData.nafCode}
              onChange={(code) => updateField('nafCode', code)}
            />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('app:addLaundromat.creating', 'Ajout en cours...')}
              </>
            ) : (
              t('app:addLaundromat.submit', 'Ajouter')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
