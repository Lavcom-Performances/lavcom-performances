import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectGroup, SelectValue } from "@/components/ui/select";
import { MapPin, Mailbox, Map, Globe, Home } from "lucide-react";
import { FormField } from "./FormField";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { ZONE_TYPES, COUNTRIES } from "@/config/simulatorFormOptions";
import type { AddressSearchResult } from "@/hooks/useAddressSearch";
import { defaultSimulationProject } from "@/hooks/useSimulatorProject";
import { CountryValue } from "@/types/simulatorFormOptions.types";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { useSimulatorStepErrors } from "@/contexts/SimulatorStepContext";
import { useTranslation } from "react-i18next";

export function LocationCard() {
  const { t } = useTranslation("paid-simulator");
  const { project, updateProject } = useSimulatorProjectContext();
  const { fieldError } = useSimulatorStepErrors();
  const projectCountry =
    COUNTRIES.find(
      (country) => country.label === (project.country || defaultSimulationProject.country)
    ) ?? COUNTRIES[0];

  const getCountryLabel = (countryValue: CountryValue): string =>
    COUNTRIES.find((country) => country.value === countryValue)?.label ?? COUNTRIES[0].label;

  const handleCountryChange = (value: CountryValue) => {
    updateProject({
      country: getCountryLabel(value),
      address: "",
      city: "",
      postalCode: "",
      departmentCode: "",
      departmentName: "",
      region: "",
    });
  };

  const handleAddressSelect = (selectedAddress: AddressSearchResult) => {
    updateProject({
      address: selectedAddress.address,
      city: selectedAddress.city,
      postalCode: selectedAddress.postalCode,
      departmentCode: selectedAddress.departmentCode ?? "",
      departmentName: selectedAddress.departmentName ?? "",
      region: selectedAddress.region ?? "",
    });
  };

  const handleAddressInputChange = (value: string) => {
    updateProject({
      address: value,
      city: "",
      postalCode: "",
      departmentCode: "",
      departmentName: "",
      region: "",
    });
  };

  return (
    <div className="space-y-6">
      <FormField label={t("project.location.country")} htmlFor="country" icon={Globe} required error={fieldError("country")}>
        <Select value={projectCountry.value} onValueChange={(value) => handleCountryChange(value as CountryValue)}>
          <SelectTrigger id="country" className="bg-white shadow-form" aria-invalid={Boolean(fieldError("country"))}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.value}>
                  <span className="mr-2">{country.flag}</span>
                  {t(`options.countries.${country.value}`)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label={t("project.location.address")}
        htmlFor="address"
        icon={Home}
        required
        hint={t("project.location.addressHint")}
        error={fieldError("address")}
      >
        <AddressAutocomplete
          id="address"
          value={project.address ?? defaultSimulationProject.address}
          countryCode={projectCountry.code}
          onSelect={handleAddressSelect}
          onInputChange={handleAddressInputChange}
        />
      </FormField>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          label={t("project.location.city")}
          htmlFor="city"
          icon={MapPin}
          required
          hint={t("project.location.autoFilled")}
          error={fieldError("city")}
        >
          <Input
            id="city"
            value={project.city ?? defaultSimulationProject.city}
            disabled
            aria-disabled
            aria-invalid={Boolean(fieldError("city"))}
            placeholder={t("project.location.cityPlaceholder")}
            className={project.city
              ? "bg-white shadow-form disabled:opacity-100"
              : "bg-white shadow-form disabled:opacity-50"
            }
          />
        </FormField>
        <FormField
          label={t("project.location.postalCode")}
          htmlFor="zip"
          icon={Mailbox}
          hint={t("project.location.autoFilled")}
        >
          <Input
            id="zip"
            value={project.postalCode ?? defaultSimulationProject.postalCode}
            disabled
            aria-disabled
            placeholder={t("project.location.postalCodePlaceholder")}
            className={project.city
              ? "bg-white shadow-form disabled:opacity-100"
              : "bg-white shadow-form disabled:opacity-50"
            }
          />
        </FormField>
      </div>

      <FormField label={t("project.location.zoneType")} htmlFor="zone" icon={Map} required error={fieldError("zoneType")}>
        <Select
          value={project.zoneType ?? defaultSimulationProject.zoneType}
          onValueChange={(value) => updateProject({ zoneType: value })}
        >
          <SelectTrigger id="zone" className="bg-white shadow-form" aria-invalid={Boolean(fieldError("zoneType"))}>
            <SelectValue placeholder={t("project.location.zoneTypePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {ZONE_TYPES.map((zoneType) => (
              <SelectItem key={zoneType.value} value={zoneType.value}>
                {t(`options.zoneTypes.${zoneType.value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
}
