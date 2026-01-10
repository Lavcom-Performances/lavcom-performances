/**
 * AddLaundromatDialog.tsx
 * 
 * Modal dialog for adding a new laundromat (site) to the system.
 * Features:
 * - Optional SIRET lookup to auto-fill company information (French business ID)
 * - City autocomplete with postal code and department auto-fill (France)
 * - Optional address autocomplete
 * - Fallback to manual input if API fails
 * - Client-side validation before submission
 * - Full i18n support for 6 languages
 */

import { useState, useCallback, useEffect } from "react";
import { Loader2, Search, CheckCircle2, Info, Lock, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { AddressAutocomplete } from "@/components/laundromat/AddressAutocomplete";
import { CityAutocomplete, CitySearchResult, deriveDepartmentCode } from "@/components/laundromat/CityAutocomplete";
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
  departmentCode: string;
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
  departmentCode: "",
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
  
  // Selection states
  const [citySelected, setCitySelected] = useState(false);
  const [addressSelected, setAddressSelected] = useState(false);
  
  // Fallback mode when API fails
  const [fallbackMode, setFallbackMode] = useState(false);
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setSiretInfo(null);
      setSiretSuccess(false);
      setCitySelected(false);
      setAddressSelected(false);
      setFallbackMode(false);
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

      const postalCode = result.postal_code || "";
      const departmentCode = deriveDepartmentCode(postalCode);

      setFormData(prev => ({
        ...prev,
        name: result.trade_name || result.company_name || prev.name,
        address: result.address_line1 || prev.address,
        city: result.city || prev.city,
        postalCode: postalCode,
        departmentCode: departmentCode,
        nafCode: result.naf_code || prev.nafCode,
      }));
      
      // Mark as selected if we got valid location data
      if (result.city && result.postal_code) {
        setCitySelected(true);
        if (result.address_line1) {
          setAddressSelected(true);
        }
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
  // CITY SELECTION HANDLER
  // -------------------------------------------------------------------------

  const handleCitySelect = useCallback((result: CitySearchResult) => {
    setFormData(prev => ({
      ...prev,
      city: result.city,
      postalCode: result.postalCode,
      departmentCode: result.departmentCode,
    }));
    setCitySelected(true);
    setValidationErrors(prev => ({
      ...prev,
      city: false,
      postalCode: false,
    }));
  }, []);

  const handleCityInputChange = useCallback((value: string) => {
    setFormData(prev => ({
      ...prev,
      city: value,
      // In fallback mode, keep postal code if manually entered
      postalCode: fallbackMode ? prev.postalCode : "",
      departmentCode: fallbackMode ? prev.departmentCode : "",
    }));
    if (!fallbackMode) {
      setCitySelected(false);
    }
    setValidationErrors(prev => ({ ...prev, city: false }));
  }, [fallbackMode]);

  // -------------------------------------------------------------------------
  // ADDRESS SELECTION HANDLER (Optional enhancement)
  // -------------------------------------------------------------------------

  const handleAddressSelect = useCallback((result: AddressSearchResult) => {
    const departmentCode = deriveDepartmentCode(result.postalCode);
    
    setFormData(prev => ({
      ...prev,
      address: result.address,
      city: result.city,
      postalCode: result.postalCode,
      departmentCode: departmentCode,
      country: result.countryCode || prev.country,
    }));
    setAddressSelected(true);
    setCitySelected(true);
    setValidationErrors(prev => ({
      ...prev,
      address: false,
      city: false,
      postalCode: false,
    }));
  }, []);

  const handleAddressInputChange = useCallback((value: string) => {
    updateField('address', value);
    setAddressSelected(false);
  }, [updateField]);

  // -------------------------------------------------------------------------
  // POSTAL CODE MANUAL HANDLER (Fallback mode)
  // -------------------------------------------------------------------------

  const handlePostalCodeChange = useCallback((value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 5);
    const departmentCode = deriveDepartmentCode(cleanValue);
    
    setFormData(prev => ({
      ...prev,
      postalCode: cleanValue,
      departmentCode: departmentCode,
    }));
    setValidationErrors(prev => ({ ...prev, postalCode: false }));
  }, []);

  // -------------------------------------------------------------------------
  // COUNTRY CHANGE HANDLER
  // -------------------------------------------------------------------------

  const handleCountryChange = useCallback((value: string) => {
    setFormData(prev => ({
      ...prev,
      country: value,
      address: "",
      city: "",
      postalCode: "",
      departmentCode: "",
    }));
    setCitySelected(false);
    setAddressSelected(false);
    setFallbackMode(false);
  }, []);

  // Unlock city for editing
  const unlockCity = () => {
    setCitySelected(false);
    setAddressSelected(false);
    setFormData(prev => ({
      ...prev,
      city: "",
      postalCode: "",
      departmentCode: "",
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
    
    if (!formData.country) {
      errors.country = true;
    }
    
    if (!formData.city.trim()) {
      errors.city = true;
    }
    
    // In normal mode, city must be selected from suggestions
    // In fallback mode, we also need postal code
    if (!fallbackMode && !citySelected) {
      errors.city = true;
    }
    
    if (!formData.postalCode.trim()) {
      errors.postalCode = true;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // -------------------------------------------------------------------------
  // FORM SUBMISSION
  // -------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!validateForm()) {
      if (!citySelected && !fallbackMode && formData.city.trim()) {
        toast({
          title: t('app:newLaundry.validationError'),
          description: t('app:newLaundry.cityMustBeSelected'),
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

  // Check if France is selected
  const isFrance = formData.country === "FR";

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
          
          {/* SIRET Field (Optional - France only) */}
          {isFrance && (
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
          )}

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
              disabled={citySelected}
              hasError={validationErrors.country}
            />
            {citySelected && (
              <p className="text-xs text-muted-foreground">
                {t('app:newLaundry.countryLocked')}
              </p>
            )}
          </div>

          {/* City Field (Required) - Autocomplete for all countries */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {t('app:newLaundry.cityLabel')} *
              {citySelected && <Lock className="h-3 w-3 text-muted-foreground" />}
            </Label>
            <CityAutocomplete
              value={formData.city}
              countryCode={formData.country}
              onSelect={handleCitySelect}
              onChange={handleCityInputChange}
              placeholder={isFrance 
                ? t('app:newLaundry.citySearchPlaceholder') 
                : t('app:newLaundry.citySearchPlaceholderInternational')
              }
              disabled={citySelected}
              hasError={validationErrors.city}
              fallbackMode={fallbackMode}
              onFallbackModeChange={setFallbackMode}
            />
            {citySelected && !fallbackMode && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" />
                {t('app:newLaundry.cityLocked')}
                {' '}
                <button
                  type="button"
                  onClick={unlockCity}
                  className="text-primary hover:underline"
                >
                  {t('app:newLaundry.unlock')}
                </button>
              </p>
            )}
            {!citySelected && !fallbackMode && (
              <p className="text-xs text-muted-foreground">
                {t('app:newLaundry.cityHelp')}
              </p>
            )}
          </div>

          {/* Postal Code Field */}
          <div className="space-y-2">
            <Label htmlFor="postal-code" className="flex items-center gap-2">
              {t('app:newLaundry.postalCodeLabel')} *
              {citySelected && !fallbackMode && <Lock className="h-3 w-3 text-muted-foreground" />}
            </Label>
            {fallbackMode || !isFrance ? (
              <Input
                id="postal-code"
                placeholder={t('app:newLaundry.postalCodeEnterPlaceholder')}
                value={formData.postalCode}
                onChange={(e) => handlePostalCodeChange(e.target.value)}
                className={cn(validationErrors.postalCode && "border-destructive")}
                maxLength={5}
              />
            ) : (
              <Input
                id="postal-code"
                placeholder={t('app:newLaundry.postalCodePlaceholder')}
                value={formData.postalCode}
                readOnly
                className={cn(
                  "bg-muted/50",
                  validationErrors.postalCode && "border-destructive"
                )}
              />
            )}
          </div>

          {/* Department Field (France only) */}
          {isFrance && (
            <div className="space-y-2">
              <Label htmlFor="department" className="flex items-center gap-2">
                {t('app:newLaundry.departmentLabel')}
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                id="department"
                placeholder={t('app:newLaundry.departmentPlaceholder')}
                value={formData.departmentCode}
                readOnly
                className="bg-muted/50"
              />
            </div>
          )}

          {/* Address Field (Optional but recommended) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {t('app:newLaundry.addressLabel')}
              <span className="text-xs text-muted-foreground font-normal">
                ({t('app:newLaundry.optional')})
              </span>
            </Label>
            {isFrance && !fallbackMode ? (
              <>
                <AddressAutocomplete
                  value={formData.address}
                  onSelect={handleAddressSelect}
                  onChange={handleAddressInputChange}
                  placeholder={t('app:newLaundry.addressPlaceholder')}
                  disabled={addressSelected}
                  countryCode={formData.country}
                  hasError={validationErrors.address}
                />
                {addressSelected && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {t('app:newLaundry.addressLocked')}
                    {' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAddressSelected(false);
                        updateField('address', '');
                      }}
                      className="text-primary hover:underline"
                    >
                      {t('app:newLaundry.unlock')}
                    </button>
                  </p>
                )}
              </>
            ) : (
              <Input
                placeholder={t('app:newLaundry.addressManualPlaceholder')}
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            )}
          </div>

          {/* NAF Code Field (Optional - France only) */}
          {isFrance && (
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
          )}

          {/* Fallback mode notice */}
          {fallbackMode && (
            <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t('app:newLaundry.fallbackModeNotice')}</span>
            </div>
          )}

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
