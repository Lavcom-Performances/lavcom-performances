/**
 * AddLaundromatDialog.tsx
 *
 * Modal dialog for adding a new laundromat (site) to the system.
 * Features:
 * - Optional SIRET lookup to auto-fill company information (French business ID)
 * - France: City validated against postal code using local CSV index
 * - Other countries: City autocomplete via APIs
 * - Optional address autocomplete
 * - Fallback to manual input if API fails
 * - Client-side validation before submission
 * - Full i18n support for 6 languages
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { Loader2, Search, CheckCircle2, Info, Lock, AlertCircle, ChevronDown, RotateCcw } from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { AddressAutocomplete } from "@/components/laundromat/AddressAutocomplete";
import { CityAutocomplete, CitySearchResult, deriveDepartmentCode } from "@/components/laundromat/CityAutocomplete";
import { NafCodeSelect } from "@/components/laundromat/NafCodeSelect";
import { CountrySelect } from "@/components/laundromat/CountrySelect";
import { DuplicateWarningDialog, type DuplicateSite } from "@/components/laundromat/DuplicateWarningDialog";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { AddressSearchResult } from "@/hooks/useAddressSearch";
import { supabase } from "@/integrations/supabase/client";
import { useDuplicateCheck } from "@/hooks/useDuplicateCheck";
import {
  loadPostalCityIndex,
  getCitiesForPostalCode,
  getDepartmentFor,
  isValidCityForPostalCode,
  isValidPostalCode,
  logPostalValidationEvent,
  deriveDepartmentCodeFromPostal,
} from "@/lib/fr/postalCityIndex";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const { t } = useTranslation(["app", "errors"]);

  // Form persistence - survives page refresh and browser crashes
  const {
    formData: persistedFormData,
    setFormData: setPersistedFormData,
    clearSavedData,
    hasSavedData,
    resetForm: resetPersistedForm,
  } = useFormPersistence<LaundryFormData>({
    key: "add-laundromat-dialog",
    initialData: initialFormData,
    ttlMs: 24 * 60 * 60 * 1000, // 24 hours
    enabled: true,
  });

  // Use persisted form data
  const [formData, setFormDataInternal] = useState<LaundryFormData>(persistedFormData);

  // Sync persisted data with internal state
  useEffect(() => {
    setFormDataInternal(persistedFormData);
  }, [persistedFormData]);

  // Wrapper to update both internal and persisted state
  const setFormData = useCallback((updater: LaundryFormData | ((prev: LaundryFormData) => LaundryFormData)) => {
    setFormDataInternal((prev) => {
      const newData = typeof updater === "function" ? updater(prev) : updater;
      setPersistedFormData(newData);
      return newData;
    });
  }, [setPersistedFormData]);

  // SIRET lookup states
  const [isLoadingSiret, setIsLoadingSiret] = useState(false);
  const [siretInfo, setSiretInfo] = useState<string | null>(null);
  const [siretSuccess, setSiretSuccess] = useState(false);

  // Form submission state
  const [isCreating, setIsCreating] = useState(false);

  // Selection states
  const [citySelected, setCitySelected] = useState(false);
  const [addressSelected, setAddressSelected] = useState(false);

  // Fallback mode when API fails (for non-France countries)
  const [fallbackMode, setFallbackMode] = useState(false);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // France postal code validation state
  const [frCityOptions, setFrCityOptions] = useState<string[]>([]);
  const [frPostalCodeValid, setFrPostalCodeValid] = useState<boolean | null>(null);
  const [frIndexLoading, setFrIndexLoading] = useState(false);
  const [frIndexLoaded, setFrIndexLoaded] = useState(false);

  // Duplicate detection state (TAEX-236)
  const { checkDuplicates, isChecking: isCheckingDuplicates } = useDuplicateCheck();
  const [duplicatesFound, setDuplicatesFound] = useState<DuplicateSite[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [bypassDuplicateCheck, setBypassDuplicateCheck] = useState(false);

  // Check if persisted data has values to show restore message
  const hasRestoredDraft = useMemo(() => {
    return hasSavedData && (
      persistedFormData.name !== initialFormData.name ||
      persistedFormData.city !== initialFormData.city ||
      persistedFormData.address !== initialFormData.address
    );
  }, [hasSavedData, persistedFormData]);

  // Load France postal code index when dialog opens with France selected
  useEffect(() => {
    if (open && formData.country === "FR" && !frIndexLoaded) {
      setFrIndexLoading(true);
      loadPostalCityIndex()
        .then(() => {
          setFrIndexLoaded(true);
        })
        .catch((err) => {
          console.error("[AddLaundromatDialog] Failed to load postal index:", err);
        })
        .finally(() => {
          setFrIndexLoading(false);
        });
    }
  }, [open, formData.country, frIndexLoaded]);

  // Re-validate France city options when dialog opens with restored data
  useEffect(() => {
    if (open && formData.country === "FR" && formData.postalCode.length === 5 && frIndexLoaded) {
      const cities = getCitiesForPostalCode(formData.postalCode);
      if (cities.length > 0) {
        setFrCityOptions(cities);
        setFrPostalCodeValid(true);
        // Check if restored city is valid
        if (formData.city && isValidCityForPostalCode(formData.postalCode, formData.city)) {
          setCitySelected(true);
        }
      }
    }
  }, [open, frIndexLoaded]);

  // Reset form when dialog closes successfully (not on cancel with unsaved data)
  const handleDialogClose = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      // Don't clear saved data on close - user might want to continue later
      setSiretInfo(null);
      setSiretSuccess(false);
      setCitySelected(false);
      setAddressSelected(false);
      setFallbackMode(false);
      setValidationErrors({});
      setFrCityOptions([]);
      setFrPostalCodeValid(null);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  // Field update handler
  const updateField = useCallback(<K extends keyof LaundryFormData>(field: K, value: LaundryFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => ({ ...prev, [field]: false }));
  }, []);

  // -------------------------------------------------------------------------
  // SIRET HANDLING
  // -------------------------------------------------------------------------

  const handleSiretChange = async (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 14);
    updateField("siret", cleanValue);
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
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setSiretInfo(t("app:newLaundry.siretUnavailable"));
        return;
      }

      const postalCode = result.postal_code || "";
      const departmentCode = deriveDepartmentCode(postalCode);

      setFormData((prev) => ({
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
        title: t("app:newLaundry.siretSuccess"),
        description: t("app:newLaundry.siretSuccessDescription"),
      });
    } catch (error) {
      console.error("Error fetching SIRET data:", error);
      setSiretInfo(t("app:newLaundry.siretUnavailable"));
    } finally {
      setIsLoadingSiret(false);
    }
  };

  // -------------------------------------------------------------------------
  // CITY SELECTION HANDLER
  // -------------------------------------------------------------------------

  const handleCitySelect = useCallback((result: CitySearchResult) => {
    setFormData((prev) => ({
      ...prev,
      city: result.city,
      postalCode: result.postalCode,
      departmentCode: result.departmentCode,
    }));
    setCitySelected(true);
    setValidationErrors((prev) => ({
      ...prev,
      city: false,
      postalCode: false,
    }));
  }, []);

  const handleCityInputChange = useCallback(
    (value: string) => {
      setFormData((prev) => ({
        ...prev,
        city: value,
        // In fallback mode, keep postal code if manually entered
        postalCode: fallbackMode ? prev.postalCode : "",
        departmentCode: fallbackMode ? prev.departmentCode : "",
      }));
      if (!fallbackMode) {
        setCitySelected(false);
      }
      setValidationErrors((prev) => ({ ...prev, city: false }));
    },
    [fallbackMode],
  );

  // -------------------------------------------------------------------------
  // ADDRESS SELECTION HANDLER (Optional enhancement)
  // -------------------------------------------------------------------------

  // Legacy handler for onSelect (backward compatibility)
  const handleAddressSelect = useCallback((result: AddressSearchResult) => {
    const departmentCode = result.department || deriveDepartmentCode(result.postalCode);

    setFormData((prev) => ({
      ...prev,
      address: result.address,
      city: result.city || prev.city,
      postalCode: result.postalCode || prev.postalCode,
      departmentCode: departmentCode || prev.departmentCode,
      country: result.countryCode || prev.country,
    }));
    
    if (result.city && result.postalCode) {
      setAddressSelected(true);
      setCitySelected(true);
    }
    
    setValidationErrors((prev) => ({
      ...prev,
      address: false,
      city: false,
      postalCode: false,
    }));
  }, []);

  // New handler using onAutofill callback - provides complete data from search API
  const handleAddressAutofill = useCallback((data: {
    address: string;
    postcode: string;
    city: string;
    department: string;
    country: "FR";
  }) => {
    setFormData((prev) => ({
      ...prev,
      address: data.address,
      city: data.city || prev.city,
      postalCode: data.postcode || prev.postalCode,
      departmentCode: data.department || prev.departmentCode,
      country: data.country,
    }));
    
    if (data.city && data.postcode) {
      setAddressSelected(true);
      setCitySelected(true);
    }
    
    setValidationErrors((prev) => ({
      ...prev,
      address: false,
      city: false,
      postalCode: false,
    }));
  }, []);

  const handleAddressInputChange = useCallback(
    (value: string) => {
      updateField("address", value);
      setAddressSelected(false);
    },
    [updateField],
  );

  // -------------------------------------------------------------------------
  // POSTAL CODE CHANGE HANDLER (France uses CSV index)
  // -------------------------------------------------------------------------

  const handlePostalCodeChange = useCallback((value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 5);
    
    setFormData((prev) => ({
      ...prev,
      postalCode: cleanValue,
      // Clear city when postal code changes (France only)
      city: formData.country === "FR" ? "" : prev.city,
      departmentCode: "",
    }));
    setCitySelected(false);
    setFrCityOptions([]);
    setFrPostalCodeValid(null);
    setValidationErrors((prev) => ({ ...prev, postalCode: false, city: false }));

    // For France: lookup cities from CSV index when 5 digits entered
    if (formData.country === "FR" && cleanValue.length === 5 && frIndexLoaded) {
      const cities = getCitiesForPostalCode(cleanValue);
      if (cities.length > 0) {
        setFrCityOptions(cities);
        setFrPostalCodeValid(true);
        const dept = deriveDepartmentCodeFromPostal(cleanValue);
        setFormData((prev) => ({
          ...prev,
          postalCode: cleanValue,
          departmentCode: dept,
        }));
      } else {
        setFrCityOptions([]);
        setFrPostalCodeValid(false);
        // Log to observability
        logPostalValidationEvent('postal_code_not_found', cleanValue, 'FR');
      }
    } else if (formData.country !== "FR") {
      // Non-France: derive department from postal code
      const departmentCode = deriveDepartmentCode(cleanValue);
      setFormData((prev) => ({
        ...prev,
        postalCode: cleanValue,
        departmentCode: departmentCode,
      }));
    }
  }, [formData.country, frIndexLoaded]);

  // Handle France city selection from dropdown
  const handleFranceCitySelect = useCallback((city: string) => {
    const dept = getDepartmentFor(formData.postalCode, city);
    setFormData((prev) => ({
      ...prev,
      city,
      departmentCode: dept || deriveDepartmentCodeFromPostal(prev.postalCode),
    }));
    setCitySelected(true);
    setValidationErrors((prev) => ({ ...prev, city: false }));
  }, [formData.postalCode]);

  // -------------------------------------------------------------------------
  // COUNTRY CHANGE HANDLER
  // -------------------------------------------------------------------------

  const handleCountryChange = useCallback((value: string) => {
    setFormData((prev) => ({
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
    setFrCityOptions([]);
    setFrPostalCodeValid(null);
    
    // Load France index if switching to France
    if (value === "FR" && !frIndexLoaded) {
      setFrIndexLoading(true);
      loadPostalCityIndex()
        .then(() => setFrIndexLoaded(true))
        .catch(console.error)
        .finally(() => setFrIndexLoading(false));
    }
  }, [frIndexLoaded]);

  // Unlock city for editing
  const unlockCity = () => {
    setCitySelected(false);
    setAddressSelected(false);
    setFormData((prev) => ({
      ...prev,
      city: "",
      postalCode: "",
      departmentCode: "",
    }));
    setFrCityOptions([]);
    setFrPostalCodeValid(null);
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

    if (!formData.postalCode.trim()) {
      errors.postalCode = true;
    }

    // France-specific validation
    if (formData.country === "FR") {
      // Postal code must be valid (in CSV index)
      if (formData.postalCode.length === 5 && frPostalCodeValid === false) {
        errors.postalCode = true;
      }
      
      // City must be selected from dropdown (not free text)
      if (!citySelected) {
        errors.city = true;
      }
      
      // Validate city against postal code
      if (formData.city && formData.postalCode.length === 5 && frIndexLoaded) {
        if (!isValidCityForPostalCode(formData.postalCode, formData.city)) {
          errors.city = true;
          // Log validation failure
          logPostalValidationEvent('city_validation_failed', formData.postalCode, 'FR', {
            attempted_city: formData.city,
          });
        }
      }
      
      // Department must be filled
      if (!formData.departmentCode) {
        errors.departmentCode = true;
      }
    } else {
      // Non-France: city must be selected from suggestions (or fallback mode)
      if (!fallbackMode && !citySelected) {
        errors.city = true;
      }
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
          title: t("app:newLaundry.validationError"),
          description: t("app:newLaundry.cityMustBeSelected"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("app:newLaundry.validationError"),
          description: t("app:newLaundry.validationErrorDescription"),
          variant: "destructive",
        });
      }
      return;
    }

    setIsCreating(true);
    try {
      // TAEX-236: Check for duplicates before creating (unless bypassed)
      if (!bypassDuplicateCheck && formData.postalCode) {
        const duplicates = await checkDuplicates({
          name: formData.name,
          address: formData.address,
          postalCode: formData.postalCode,
          city: formData.city,
          country: formData.country,
        });

        if (duplicates.length > 0) {
          setDuplicatesFound(duplicates);
          setShowDuplicateWarning(true);
          setIsCreating(false);
          return;
        }
      }

      // Proceed with creation
      await proceedWithCreation();
    } catch (error) {
      console.error("Error creating site:", error);
      setIsCreating(false);
    }
  };

  // Separate function for actual creation logic
  const proceedWithCreation = async () => {
    setIsCreating(true);
    try {
      // Server-side postal code validation
      const { data: validation, error: validationError } = await supabase.functions.invoke("validate-postal-code", {
        body: {
          postalCode: formData.postalCode,
          countryCode: formData.country,
          city: formData.city,
        },
      });

      if (validationError) {
        console.warn("[AddLaundromatDialog] Postal code validation failed, proceeding anyway:", validationError);
        // Continue even if validation service fails - don't block user
      } else if (validation && !validation.valid) {
        toast({
          title: t("app:newLaundry.validationError"),
          description: validation.error || t("app:newLaundry.invalidPostalCode"),
          variant: "destructive",
        });
        setValidationErrors((prev) => ({ ...prev, postalCode: true }));
        setIsCreating(false);
        return;
      } else if (validation?.departmentCode && formData.country === "FR") {
        // Update department code from server validation
        setFormData((prev) => ({
          ...prev,
          departmentCode: validation.departmentCode,
        }));
      }

      await onSubmit({
        ...formData,
        departmentCode: validation?.departmentCode || formData.departmentCode,
      });
      
      // Clear saved draft on successful submission
      clearSavedData();
      resetPersistedForm();
      
      // Reset duplicate check state
      setBypassDuplicateCheck(false);
      setDuplicatesFound([]);
      
      handleDialogClose(false);
    } catch (error) {
      console.error("Error creating site:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle duplicate warning dialog actions
  const handleDuplicateGoBack = useCallback(() => {
    setShowDuplicateWarning(false);
    setBypassDuplicateCheck(false);
  }, []);

  const handleDuplicateCreateAnyway = useCallback(() => {
    setShowDuplicateWarning(false);
    setBypassDuplicateCheck(true);
    // Proceed with creation
    proceedWithCreation();
  }, [formData]);

  // Clear draft handler
  const handleClearDraft = useCallback(() => {
    resetPersistedForm();
    setFormDataInternal(initialFormData);
    setSiretInfo(null);
    setSiretSuccess(false);
    setCitySelected(false);
    setAddressSelected(false);
    setFallbackMode(false);
    setValidationErrors({});
    setFrCityOptions([]);
    setFrPostalCodeValid(null);
  }, [resetPersistedForm]);

  // Check if France is selected
  const isFrance = formData.country === "FR";

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("app:newLaundry.title")}</DialogTitle>
        </DialogHeader>

        {/* Draft restored indicator */}
        {hasRestoredDraft && (
          <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg border border-border/50 text-sm">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{t("app:newLaundry.draftRestored")}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearDraft}
              className="h-7 text-xs gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              {t("app:newLaundry.clearDraft")}
            </Button>
          </div>
        )}

        <div className="space-y-4 py-4">
          {/* SIRET Field (Optional - France only) */}
          {isFrance && (
            <div className="space-y-2">
              <Label htmlFor="siret" className="flex items-center gap-2">
                {t("app:newLaundry.siretLabel")}
                <span className="text-xs text-muted-foreground font-normal">
                  ({t("app:newLaundry.optional")} - {t("app:newLaundry.siretHelp")})
                </span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="siret"
                  placeholder={t("app:newLaundry.siretPlaceholder")}
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
                  {14 - formData.siret.length} {t("app:newLaundry.digitsRemaining")}
                </p>
              )}
            </div>
          )}

          {/* Name Field (Required) */}
          <div className="space-y-2">
            <Label htmlFor="laundry-name">{t("app:newLaundry.nameLabel")} *</Label>
            <Input
              id="laundry-name"
              placeholder={t("app:newLaundry.namePlaceholder")}
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={cn(validationErrors.name && "border-destructive")}
            />
          </div>

          {/* Country Field (Required) */}
          <div className="space-y-2">
            <Label>{t("app:newLaundry.countryLabel")} *</Label>
            <CountrySelect
              value={formData.country}
              onChange={handleCountryChange}
              disabled={citySelected}
              hasError={validationErrors.country}
            />
            {citySelected && <p className="text-xs text-muted-foreground">{t("app:newLaundry.countryLocked")}</p>}
          </div>

          {/* Address Field (Required - autocomplete fills other fields) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {t("app:newLaundry.addressLabel")} *
            </Label>
            {isFrance && !fallbackMode ? (
              <>
                <AddressAutocomplete
                  value={formData.address}
                  onSelect={handleAddressSelect}
                  onAutofill={handleAddressAutofill}
                  onChange={handleAddressInputChange}
                  placeholder={t("app:newLaundry.addressPlaceholder")}
                  disabled={addressSelected}
                  countryCode={formData.country}
                  hasError={validationErrors.address}
                />
                {addressSelected && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {t("app:newLaundry.addressLocked")}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAddressSelected(false);
                        updateField("address", "");
                      }}
                      className="text-primary hover:underline"
                    >
                      {t("app:newLaundry.unlock")}
                    </button>
                  </p>
                )}
              </>
            ) : (
              <Input
                placeholder={t("app:newLaundry.addressManualPlaceholder")}
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
            )}
          </div>

          {/* Postal Code Field */}
          <div className="space-y-2">
            <Label htmlFor="postal-code" className="flex items-center gap-2">
              {t("app:newLaundry.postalCodeLabel")} *
              {addressSelected && !isFrance && <Lock className="h-3 w-3 text-muted-foreground" />}
            </Label>
            {isFrance ? (
              <>
                <Input
                  id="postal-code"
                  placeholder={t("app:newLaundry.postalCodeEnterPlaceholder")}
                  value={formData.postalCode}
                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                  className={cn(
                    validationErrors.postalCode && "border-destructive",
                    frPostalCodeValid === false && formData.postalCode.length === 5 && "border-destructive"
                  )}
                  maxLength={5}
                  disabled={addressSelected}
                />
                {frIndexLoading && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("app:newLaundry.loadingPostalIndex")}
                  </p>
                )}
                {frPostalCodeValid === false && formData.postalCode.length === 5 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {t("app:newLaundry.postalCodeNotFound")}
                  </p>
                )}
              </>
            ) : fallbackMode ? (
              <Input
                id="postal-code"
                placeholder={t("app:newLaundry.postalCodeEnterPlaceholder")}
                value={formData.postalCode}
                onChange={(e) => handlePostalCodeChange(e.target.value)}
                className={cn(validationErrors.postalCode && "border-destructive")}
                maxLength={10}
              />
            ) : (
              <Input
                id="postal-code"
                placeholder={t("app:newLaundry.postalCodePlaceholder")}
                value={formData.postalCode}
                readOnly={addressSelected}
                className={cn(addressSelected && "bg-muted/50", validationErrors.postalCode && "border-destructive")}
                onChange={(e) => !addressSelected && handlePostalCodeChange(e.target.value)}
              />
            )}
          </div>

          {/* City Field */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {t("app:newLaundry.cityLabel")} *
              {citySelected && <Lock className="h-3 w-3 text-muted-foreground" />}
            </Label>
            
            {/* France: City dropdown based on postal code */}
            {isFrance ? (
              <>
                {frCityOptions.length > 0 ? (
                  <>
                    <Select
                      value={formData.city}
                      onValueChange={handleFranceCitySelect}
                      disabled={citySelected}
                    >
                      <SelectTrigger 
                        className={cn(
                          citySelected && "bg-muted/50",
                          validationErrors.city && "border-destructive"
                        )}
                      >
                        <SelectValue placeholder={t("app:newLaundry.selectCity")} />
                      </SelectTrigger>
                      <SelectContent>
                        {frCityOptions.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {citySelected && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        {t("app:newLaundry.cityLocked")}{" "}
                        <button
                          type="button"
                          onClick={unlockCity}
                          className="text-primary hover:underline"
                        >
                          {t("app:newLaundry.unlock")}
                        </button>
                      </p>
                    )}
                  </>
                ) : formData.postalCode.length === 5 && frPostalCodeValid !== false ? (
                  <Input
                    placeholder={t("app:newLaundry.enterPostalCodeFirst")}
                    value={formData.city}
                    disabled
                    className="bg-muted/50"
                  />
                ) : (
                  <Input
                    placeholder={t("app:newLaundry.enterPostalCodeFirst")}
                    value=""
                    disabled
                    className="bg-muted/50"
                  />
                )}
                {!citySelected && frCityOptions.length > 0 && (
                  <p className="text-xs text-muted-foreground">{t("app:newLaundry.selectCityHelp")}</p>
                )}
              </>
            ) : fallbackMode ? (
              /* Non-France fallback mode */
              <CityAutocomplete
                value={formData.city}
                countryCode={formData.country}
                onSelect={handleCitySelect}
                onChange={handleCityInputChange}
                placeholder={t("app:newLaundry.citySearchPlaceholderInternational")}
                disabled={citySelected}
                hasError={validationErrors.city}
                fallbackMode={fallbackMode}
                onFallbackModeChange={setFallbackMode}
              />
            ) : (
              /* Non-France: City autocomplete */
              <CityAutocomplete
                value={formData.city}
                countryCode={formData.country}
                onSelect={handleCitySelect}
                onChange={handleCityInputChange}
                placeholder={t("app:newLaundry.citySearchPlaceholderInternational")}
                disabled={citySelected}
                hasError={validationErrors.city}
                fallbackMode={fallbackMode}
                onFallbackModeChange={setFallbackMode}
              />
            )}
          </div>

          {/* Department Field (France only) */}
          {isFrance && (
            <div className="space-y-2">
              <Label htmlFor="department" className="flex items-center gap-2">
                {t("app:newLaundry.departmentLabel")}
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                id="department"
                placeholder={t("app:newLaundry.departmentPlaceholder")}
                value={formData.departmentCode}
                readOnly
                className="bg-muted/50"
              />
            </div>
          )}

          {/* NAF Code Field (Optional - France only) */}
          {isFrance && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {t("app:newLaundry.nafLabel")}
                <span className="text-xs text-muted-foreground font-normal">({t("app:newLaundry.optional")})</span>
              </Label>
              <NafCodeSelect value={formData.nafCode} onChange={(code) => updateField("nafCode", code)} />
            </div>
          )}

          {/* Fallback mode notice */}
          {fallbackMode && (
            <div className="flex items-start gap-2 text-sm text-warning bg-warning/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t("app:newLaundry.fallbackModeNotice")}</span>
            </div>
          )}

          {/* Submit Button */}
          <Button onClick={handleSubmit} className="w-full" disabled={isCreating || isCheckingDuplicates}>
            {isCreating || isCheckingDuplicates ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isCheckingDuplicates 
                  ? t("app:newLaundry.checkingDuplicates", "Checking for duplicates...") 
                  : t("app:newLaundry.creating")}
              </>
            ) : (
              t("app:newLaundry.submit")
            )}
          </Button>
        </div>
      </DialogContent>

      {/* TAEX-236: Duplicate Warning Dialog */}
      <DuplicateWarningDialog
        open={showDuplicateWarning}
        onOpenChange={setShowDuplicateWarning}
        duplicates={duplicatesFound}
        onGoBack={handleDuplicateGoBack}
        onCreateAnyway={handleDuplicateCreateAnyway}
        formData={{
          postalCode: formData.postalCode,
          city: formData.city,
          country: formData.country,
        }}
      />
    </Dialog>
  );
}
