/**
 * AddLaundromatDialog.tsx
 * 
 * Modal dialog for adding a new laundromat (site) to the system.
 * Features:
 * - Optional SIRET lookup to auto-fill company information (French business ID)
 * - Address autocomplete with Google/French address API
 * - City autocomplete with postal code auto-fill
 * - NAF code selector (French business activity classification)
 * - Client-side validation before submission
 */

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

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Shape of the laundromat form data
 * All fields that will be collected and submitted to the database
 */
interface LaundryFormData {
  name: string;        // Business name of the laundromat
  address: string;     // Street address
  city: string;        // City name
  postalCode: string;  // Postal/ZIP code
  country: string;     // ISO country code (e.g., "FR")
  siret: string;       // French business identification number (14 digits)
  nafCode: string;     // French activity classification code
}

/**
 * Props for the AddLaundromatDialog component
 */
interface AddLaundromatDialogProps {
  open: boolean;                                    // Controls dialog visibility
  onOpenChange: (open: boolean) => void;            // Callback when dialog open state changes
  onSubmit: (data: LaundryFormData) => Promise<void>; // Callback to handle form submission
}

/**
 * Default empty state for the form
 * Country defaults to France ("FR") as primary market
 */
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
  // i18n hook for translations (supports French, English, etc.)
  const { t } = useTranslation(['app', 'errors']);
  
  // -------------------------------------------------------------------------
  // STATE MANAGEMENT
  // -------------------------------------------------------------------------
  
  // Main form data state
  const [formData, setFormData] = useState<LaundryFormData>(initialFormData);
  
  // SIRET lookup states
  const [isLoadingSiret, setIsLoadingSiret] = useState(false);  // Loading spinner during API call
  const [siretInfo, setSiretInfo] = useState<string | null>(null); // Info/error message for SIRET
  const [siretSuccess, setSiretSuccess] = useState(false);      // Green checkmark when SIRET found
  
  // Form submission state
  const [isCreating, setIsCreating] = useState(false);          // Prevents double-submit
  
  // Address lock - prevents editing after auto-fill from SIRET or address selection
  const [addressLocked, setAddressLocked] = useState(false);
  
  // Tracks which fields have validation errors (red border)
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Reset all form state when dialog closes
   * This ensures a clean slate when reopening the dialog
   */
  useEffect(() => {
    if (!open) {
      setFormData(initialFormData);
      setSiretInfo(null);
      setSiretSuccess(false);
      setAddressLocked(false);
      setValidationErrors({});
    }
  }, [open]);

  // -------------------------------------------------------------------------
  // FIELD UPDATE HANDLERS
  // -------------------------------------------------------------------------

  /**
   * Generic field updater with type safety
   * Also clears any validation error for the updated field
   */
  const updateField = useCallback(<K extends keyof LaundryFormData>(field: K, value: LaundryFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    setValidationErrors(prev => ({ ...prev, [field]: false }));
  }, []);

  // -------------------------------------------------------------------------
  // SIRET HANDLING
  // -------------------------------------------------------------------------

  /**
   * Handles SIRET input changes
   * - Strips non-digit characters
   * - Limits to 14 characters
   * - Auto-triggers API lookup when 14 digits entered
   */
  const handleSiretChange = async (value: string) => {
    // Only allow digits, max 14 characters
    const cleanValue = value.replace(/\D/g, '').slice(0, 14);
    updateField('siret', cleanValue);
    setSiretInfo(null);
    setSiretSuccess(false);

    // Auto-fetch when complete SIRET is entered
    if (cleanValue.length === 14) {
      await fetchSiretData(cleanValue);
    }
  };

  /**
   * Fetches company information from French SIRET registry
   * Calls our edge function which queries the INSEE API
   * Pre-fills form fields on success (name, address, city, postal code, NAF code)
   */
  const fetchSiretData = async (siret: string) => {
    setIsLoadingSiret(true);
    setSiretInfo(null);
    setSiretSuccess(false);

    try {
      // Call our Supabase edge function that wraps the INSEE API
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
        // Non-blocking: user can still fill form manually
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
      
      // Lock address fields if we got valid location data
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
      // Non-blocking info message - user can continue manually
      setSiretInfo(t('errors:siretLookup.unavailable', 'Service SIRET temporairement indisponible. Vous pouvez continuer manuellement.'));
    } finally {
      setIsLoadingSiret(false);
    }
  };

  // -------------------------------------------------------------------------
  // ADDRESS/CITY SELECTION HANDLERS
  // -------------------------------------------------------------------------

  /**
   * Called when user selects an address from the autocomplete dropdown
   * Updates address, city, and postal code together
   * Locks address to prevent accidental changes
   */
  const handleAddressSelect = useCallback((result: { address: string; city: string; postalCode: string }) => {
    setFormData(prev => ({
      ...prev,
      address: result.address,
      city: result.city,
      postalCode: result.postalCode,
      country: "FR", // Address API is French-specific
    }));
    setAddressLocked(true);
    // Clear any validation errors for these fields
    setValidationErrors(prev => ({
      ...prev,
      address: false,
      city: false,
      postalCode: false,
    }));
  }, []);

  /**
   * Called when user selects a city from the autocomplete dropdown
   * Updates city and postal code together
   */
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

  /**
   * Unlocks address fields for manual editing
   * Used when user wants to change auto-filled address
   */
  const unlockAddress = () => {
    setAddressLocked(false);
  };

  // -------------------------------------------------------------------------
  // FORM VALIDATION
  // -------------------------------------------------------------------------

  /**
   * Validates required fields before submission
   * Returns true if form is valid, false otherwise
   * Sets validationErrors state to highlight invalid fields
   */
  const validateForm = (): boolean => {
    const errors: Record<string, boolean> = {};
    
    // Required fields check
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
    return Object.keys(errors).length === 0; // Valid if no errors
  };

  // -------------------------------------------------------------------------
  // FORM SUBMISSION
  // -------------------------------------------------------------------------

  /**
   * Handles form submission
   * 1. Validates form
   * 2. Shows error toast if invalid
   * 3. Calls parent's onSubmit callback
   * 4. Closes dialog on success
   */
  const handleSubmit = async () => {
    // Validate before submitting
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
      // Call parent's submit handler (handles database insert)
      await onSubmit(formData);
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      console.error("Error creating site:", error);
      // Error handling/toast is expected to be done by parent
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
          <DialogTitle>{t('app:addLaundromat.title', 'Nouvelle laverie')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          
          {/* ============================================================
              SIRET FIELD (Optional)
              - French business ID (14 digits)
              - Auto-fetches company data when complete
              - Shows loading spinner and success/info states
              ============================================================ */}
          <div className="space-y-2">
            <Label htmlFor="siret" className="flex items-center gap-2">
              {t('app:addLaundromat.siretLabel', 'N° SIRET')}
              <span className="text-xs text-muted-foreground font-normal">
                ({t('app:addLaundromat.optional', 'optionnel')} - {t('app:addLaundromat.siretHelp', 'pré-remplit les champs')})
              </span>
            </Label>
            <div className="relative">
              {/* Search icon on left */}
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="siret"
                placeholder={t('app:addLaundromat.siretPlaceholder', '14 chiffres (ex: 12345678901234)')}
                value={formData.siret}
                onChange={(e) => handleSiretChange(e.target.value)}
                className={cn("pl-10 pr-10", siretSuccess && "border-green-500")}
                maxLength={14}
              />
              {/* Loading spinner while fetching */}
              {isLoadingSiret && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {/* Green checkmark on success */}
              {siretSuccess && !isLoadingSiret && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {/* Info message (shown when SIRET service unavailable) */}
            {siretInfo && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{siretInfo}</span>
              </div>
            )}
            {/* Digits remaining counter */}
            {formData.siret.length > 0 && formData.siret.length < 14 && (
              <p className="text-xs text-muted-foreground">
                {14 - formData.siret.length} {t('app:addLaundromat.digitsRemaining', 'chiffres restants')}
              </p>
            )}
          </div>

          {/* ============================================================
              NAME FIELD (Required)
              - Business name of the laundromat
              ============================================================ */}
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

          {/* ============================================================
              COUNTRY FIELD (Required)
              - Dropdown selector for country
              - Locked after address selection
              ============================================================ */}
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

          {/* ============================================================
              ADDRESS FIELD (Required)
              - Autocomplete component for French addresses
              - Locked after selection to prevent accidental changes
              ============================================================ */}
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

          {/* ============================================================
              CITY FIELD (Required)
              - Autocomplete component
              - Auto-fills postal code when city is selected
              ============================================================ */}
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

          {/* ============================================================
              POSTAL CODE FIELD (Read-only)
              - Auto-filled from address or city selection
              - Not manually editable
              ============================================================ */}
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

          {/* ============================================================
              NAF CODE FIELD (Optional)
              - French business activity classification code
              - Searchable dropdown with common laundromat codes
              ============================================================ */}
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

          {/* ============================================================
              SUBMIT BUTTON
              - Shows loading state during submission
              - Disabled while creating to prevent double-submit
              ============================================================ */}
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
