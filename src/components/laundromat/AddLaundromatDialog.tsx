/**
 * AddLaundromatDialog.tsx
 * 
 * Modal dialog for adding a new laundromat (site) to the system.
 * Features:
 * - Optional SIRET lookup to auto-fill company information (French business ID)
 * - Address autocomplete with auto-fill for City, Postal Code, and Country
 * - NAF code selector (French business activity classification)
 * - Client-side validation before submission
 * - Full i18n support for 6 languages
 */

import { useState, useCallback, useEffect } from "react";
import { Loader2, Search, CheckCircle2, Info, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { AddressAutocomplete } from "@/components/laundromat/AddressAutocomplete";
import { NafCodeSelect } from "@/components/laundromat/NafCodeSelect";
import { CountrySelect } from "@/components/laundromat/CountrySelect";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { AddressSearchResult } from "@/hooks/useAddressSearch";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AddLaundromatDialog({ open, onOpenChange, onSubmit }: AddLaundromatDialogProps) {
  const { t } = useTranslation(['app', 'errors']);
  
  // Form data state
  const [formData, setFormData] = useState<LaundryFormData>(initialFormData);
  
  // SIRET lookup states
  const [isLoadingSiret, setIsLoadingSiret] = useState(false);
  const [siretInfo, setSiretInfo] = useState<string | null>(null);
  const [siretSuccess, setSiretSuccess] = useState(false);
  
  // Form submission state
  const [isCreating, setIsCreating] = useState(false);
  
  // Address selection state - tracks if address was selected from suggestions
  const [addressSelected, setAddressSelected] = useState(false);
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setSiretInfo(null);
      setSiretSuccess(false);
      setAddressSelected(false);
      setValidationErrors({});
    }
  }, [open]);

  // Field update handler
  const updateField = useCallback(<K extends keyof LaundryFormData>(field: K, value: LaundryFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => ({ ...prev, [field]: false }));
  }, []);

  // -------------------------------------------------------------------------
  // SIRET HANDLING
  // -------------------------------------------------------------------------

  const handleSiretChange = async (value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 14);
    updateField('siret', cleanValue);
    setSiretInfo(null);
    setSiretSuccess(false);

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
        setSiretInfo(t('app:newLaundry.siretUnavailable'));
        return;
      }

      setFormData(prev => ({
        ...prev,
        name: result.trade_name || result.company_name || prev.name,
        address: result.address_line1 || prev.address,
        city: result.city || prev.city,
        postalCode: result.postal_code || prev.postalCode,
        nafCode: result.naf_code || prev.nafCode,
      }));
      
      // Mark address as selected if we got valid location data
      if (result.city && result.postal_code && result.address_line1) {
        setAddressSelected(true);
      }
      
      setSiretSuccess(true);
      toast({
        title: t('app:newLaundry.siretSuccess'),
        description: t('app:newLaundry.siretSuccessDescription'),
      });
    } catch (error) {
      console.error("Error fetching SIRET data:", error);
      setSiretInfo(t('app:newLaundry.siretUnavailable'));
    } finally {
      setIsLoadingSiret(false);
    }
  };

  // -------------------------------------------------------------------------
  // ADDRESS SELECTION HANDLER
  // -------------------------------------------------------------------------

  const handleAddressSelect = useCallback((result: AddressSearchResult) => {
    setFormData(prev => ({
      ...prev,
      address: result.address,
      city: result.city,
      postalCode: result.postalCode,
      country: result.countryCode || prev.country,
    }));
    setAddressSelected(true);
    setValidationErrors(prev => ({
      ...prev,
      address: false,
      city: false,
      postalCode: false,
    }));
  }, []);

  // Handler for manual address input changes (resets selection)
  const handleAddressInputChange = useCallback((value: string) => {
    updateField('address', value);
    // Reset auto-filled fields and selection state when user types manually
    if (addressSelected) {
      setFormData(prev => ({
        ...prev,
        address: value,
        city: "",
        postalCode: "",
      }));
      setAddressSelected(false);
    }
  }, [addressSelected, updateField]);

  // Handler for country change - resets address fields
  const handleCountryChange = useCallback((value: string) => {
    setFormData(prev => ({
      ...prev,
      country: value,
      address: "",
      city: "",
      postalCode: "",
    }));
    setAddressSelected(false);
  }, []);

  // Unlock address for editing
  const unlockAddress = () => {
    setAddressSelected(false);
    setFormData(prev => ({
      ...prev,
      city: "",
      postalCode: "",
    }));
  };

  // -------------------------------------------------------------------------
  // FORM VALIDATION
  // -------------------------------------------------------------------------

  const validateForm = (): boolean => {
    const errors: Record<string, boolean> = {};
    
    if (!formData.name.trim()) {
      errors.name = true;
    }
    
    if (!formData.address.trim()) {
      errors.address = true;
    }
    
    // Address must be selected from suggestions (not just typed)
    if (!addressSelected) {
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

  // -------------------------------------------------------------------------
  // FORM SUBMISSION
  // -------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!validateForm()) {
      // Different error messages based on what's wrong
      if (!addressSelected && formData.address.trim()) {
        toast({
          title: t('app:newLaundry.validationError'),
          description: t('app:newLaundry.addressMustBeSelected'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('app:newLaundry.validationError'),
          description: t('app:newLaundry.validationErrorDescription'),
          variant: "destructive",
        });
      }
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

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('app:newLaundry.title')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          
          {/* SIRET Field (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="siret" className="flex items-center gap-2">
              {t('app:newLaundry.siretLabel')}
              <span className="text-xs text-muted-foreground font-normal">
                ({t('app:newLaundry.optional')} - {t('app:newLaundry.siretHelp')})
              </span>
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="siret"
                placeholder={t('app:newLaundry.siretPlaceholder')}
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
            {siretInfo && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{siretInfo}</span>
              </div>
            )}
            {formData.siret.length > 0 && formData.siret.length < 14 && (
              <p className="text-xs text-muted-foreground">
                {14 - formData.siret.length} {t('app:newLaundry.digitsRemaining')}
              </p>
            )}
          </div>

          {/* Name Field (Required) */}
          <div className="space-y-2">
            <Label htmlFor="laundry-name">
              {t('app:newLaundry.nameLabel')} *
            </Label>
            <Input
              id="laundry-name"
              placeholder={t('app:newLaundry.namePlaceholder')}
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={cn(validationErrors.name && "border-destructive")}
            />
          </div>

          {/* Country Field (Required) */}
          <div className="space-y-2">
            <Label>{t('app:newLaundry.countryLabel')} *</Label>
            <CountrySelect
              value={formData.country}
              onChange={handleCountryChange}
              disabled={addressSelected}
              hasError={validationErrors.country}
            />
            {addressSelected && (
              <p className="text-xs text-muted-foreground">
                {t('app:newLaundry.countryLocked')}
              </p>
            )}
          </div>

          {/* Address Field (Required) */}
          <div className="space-y-2">
            <Label>{t('app:newLaundry.addressLabel')} *</Label>
            <AddressAutocomplete
              value={formData.address}
              onSelect={handleAddressSelect}
              onChange={handleAddressInputChange}
              placeholder={t('app:newLaundry.addressPlaceholder')}
              disabled={addressSelected}
              countryCode={formData.country}
              hasError={validationErrors.address}
            />
            {addressSelected ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" />
                {t('app:newLaundry.addressLocked')}
                {' '}
                <button
                  type="button"
                  onClick={unlockAddress}
                  className="text-primary hover:underline"
                >
                  {t('app:newLaundry.unlock')}
                </button>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('app:newLaundry.addressHelp')}
              </p>
            )}
          </div>

          {/* City Field (Read-only, auto-filled) */}
          <div className="space-y-2">
            <Label htmlFor="city" className="flex items-center gap-2">
              {t('app:newLaundry.cityLabel')} *
              {addressSelected && <Lock className="h-3 w-3 text-muted-foreground" />}
            </Label>
            <Input
              id="city"
              placeholder={t('app:newLaundry.cityPlaceholder')}
              value={formData.city}
              readOnly
              className={cn(
                "bg-muted/50",
                validationErrors.city && "border-destructive"
              )}
            />
          </div>

          {/* Postal Code Field (Read-only, auto-filled) */}
          <div className="space-y-2">
            <Label htmlFor="postal-code" className="flex items-center gap-2">
              {t('app:newLaundry.postalCodeLabel')}
              {addressSelected && <Lock className="h-3 w-3 text-muted-foreground" />}
            </Label>
            <Input
              id="postal-code"
              placeholder={t('app:newLaundry.postalCodePlaceholder')}
              value={formData.postalCode}
              readOnly
              className="bg-muted/50"
            />
          </div>

          {/* NAF Code Field (Optional) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {t('app:newLaundry.nafLabel')}
              <span className="text-xs text-muted-foreground font-normal">
                ({t('app:newLaundry.optional')})
              </span>
            </Label>
            <NafCodeSelect
              value={formData.nafCode}
              onChange={(code) => updateField('nafCode', code)}
            />
          </div>

          {/* Submit Button */}
          <Button onClick={handleSubmit} className="w-full" disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('app:newLaundry.creating')}
              </>
            ) : (
              t('app:newLaundry.submit')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
