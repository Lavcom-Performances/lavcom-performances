
# Plan — Autocomplétion d'adresse unifiée dans `/simulator/project`

## Décisions intégrées

- Nouveau composant `AddressAutocomplete` créé dans **`src/components/simulator/project/`** (isolé du legacy `src/components/simulation/AddressAutocomplete.tsx`, qui reste inchangé).
- État local nommé **`projectLocation`** pour éviter la collision avec `useLocation` de React Router.
- Hook unique `src/hooks/useAddressSearch.ts` (existant, enrichi).
- API : `https://api-adresse.data.gouv.fr/` si `country === "FR"` sinon Nominatim.
- 6 champs extraits : `address, city, postalCode, departmentCode, departmentName, region`.

## Fichiers touchés

| Fichier | Action |
|---|---|
| `src/hooks/useAddressSearch.ts` | Modifié (mapping enrichi + `postalCode`, `departmentCode`, `departmentName`, `region`) |
| `src/components/simulator/project/AddressAutocomplete.tsx` | **Créé** |
| `src/components/simulator/project/ProjectInfoForm.tsx` | Modifié (déclare `projectLocation` et le passe à `LocationCard`) |
| `src/components/simulator/project/LocationCard.tsx` | Modifié (contrôlé, branche `AddressAutocomplete` + ville/CP) |

Legacy inchangé : `src/components/simulation/AddressAutocomplete.tsx`, `CityAutocomplete.tsx`, `useCitySearch.ts`, `StepProjectInfo.tsx`.

---

## 1. `src/hooks/useAddressSearch.ts` (modifié)

Ajouts au type de sortie et au mapping. Le reste du hook (debounce, `AbortController`, gestion FR/Nominatim, `manualMode`) est conservé.

```ts
// Type de sortie unifié pour toutes les API d'adresses.
// - postalCode : code postal (5 chiffres FR)
// - departmentCode : ex "75" en FR ; "" hors FR
// - departmentName : ex "Paris" en FR ; county/state_district en Nominatim
// - region : ex "Île-de-France" en FR ; state en Nominatim
export interface AddressSearchResult {
  label: string;
  address: string;
  postalCode: string;
  city: string;
  departmentCode: string;
  departmentName: string;
  region: string;
  countryCode: string;
  countryName: string;
}
```

Mapping FR — on remplace l'appel `completion` par `search` de la BAN (`api-adresse.data.gouv.fr/search/`) qui renvoie déjà `properties.context = "75, Paris, Île-de-France"` :

```ts
// Branche FR : BAN api-adresse.data.gouv.fr
const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=8`;
const response = await fetch(url, { signal: controller.signal });
const data = await response.json();

formattedResults = (data.features ?? [])
  .filter((f: any) => f?.properties?.label)
  .map((f: any) => {
    const p = f.properties;
    // context BAN : "75, Paris, Île-de-France"
    const [departmentCode = "", departmentName = "", region = ""] =
      String(p.context ?? "").split(",").map((s: string) => s.trim());
    return {
      label: p.label,
      // address = numéro + rue si dispo, sinon le "name" renvoyé par la BAN
      address: p.housenumber ? `${p.housenumber} ${p.name}` : (p.name ?? p.label),
      postalCode: String(p.postcode ?? ""),
      city: String(p.city ?? ""),
      departmentCode,
      departmentName,
      region,
      countryCode: "FR",
      countryName: "France",
    } as AddressSearchResult;
  });
```

Mapping international (Nominatim) — on complète les 3 nouveaux champs :

```ts
formattedResults = data
  .filter((r: any) => r.address)
  .map((r: any) => {
    const a = r.address;
    const streetNumber = a.house_number || "";
    const street = a.road || a.pedestrian || a.street || "";
    return {
      label: r.display_name,
      address: [streetNumber, street].filter(Boolean).join(" ") || r.display_name.split(",")[0],
      postalCode: a.postcode || "",
      city: a.city || a.town || a.village || a.municipality || a.hamlet || "",
      // Pas de code département officiel hors FR
      departmentCode: "",
      departmentName: a.county || a.state_district || "",
      region: a.state || "",
      countryCode: country.toUpperCase(),
      countryName: a.country || "",
    } as AddressSearchResult;
  });
```

Signature du hook (inchangée) : `useAddressSearch(query, minChars = 3, countryCode = "FR")`.

---

## 2. `src/components/simulator/project/AddressAutocomplete.tsx` (créé)

Composant dédié au simulateur, isolé du legacy. UI identique (icône, dropdown, spinner) mais alimenté par `useAddressSearch`.

```tsx
import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAddressSearch, type AddressSearchResult } from "@/hooks/useAddressSearch";

interface Props {
  // Valeur affichée dans l'input (contrôlée par le parent)
  value: string;
  // Code pays ISO ("FR", "BE", ...) — pilote le choix de l'API
  country: string;
  // Callback déclenché quand l'utilisateur clique une suggestion
  onSelect: (result: AddressSearchResult) => void;
  // Callback optionnel pour suivre la frappe libre (permet au parent
  // de vider city/postalCode tant que rien n'est sélectionné)
  onInputChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  id?: string;
}

export function AddressAutocomplete({
  value,
  country,
  onSelect,
  onInputChange,
  placeholder = "Tapez et sélectionnez une adresse...",
  className,
  hasError,
  id,
}: Props) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  // justSelected empêche de rouvrir la liste après un clic sur une suggestion
  const [justSelected, setJustSelected] = useState(false);
  // isUserTyping évite de relancer une recherche quand la valeur vient des props
  const [isUserTyping, setIsUserTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Un seul hook, un seul routage FR / international
  const { results, isLoading } = useAddressSearch(
    (justSelected || !isUserTyping) ? "" : inputValue,
    3,
    country,
  );

  // Sync quand le parent modifie la valeur (ex: reset au changement de pays)
  useEffect(() => {
    setInputValue(value);
    setIsUserTyping(false);
  }, [value]);

  // Fermeture au clic extérieur
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    setJustSelected(false);
    setIsUserTyping(true);
    setIsOpen(true);
    onInputChange?.(v);
  };

  const handleSelect = (r: AddressSearchResult) => {
    setInputValue(r.address);
    setJustSelected(true);
    setIsUserTyping(false);
    setIsOpen(false);
    onSelect(r);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          value={inputValue}
          onChange={handleChange}
          onFocus={() => inputValue.length >= 3 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "pl-10 bg-white shadow-form",
            hasError && "border-destructive focus-visible:ring-destructive",
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((r, i) => (
            <button
              key={`${r.postalCode}-${r.address}-${i}`}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
            >
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && inputValue.length >= 3 && !isLoading && results.length === 0 && isUserTyping && !justSelected && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
          Aucune adresse trouvée. Essayez avec le nom de la ville.
        </div>
      )}
    </div>
  );
}
```

---

## 3. `src/components/simulator/project/ProjectInfoForm.tsx` (modifié)

On déclare ici l'état `projectLocation` (nommé pour éviter le shadow de `useLocation`) et on le passe à `LocationCard`. `departmentCode / departmentName / region` sont gardés en état, prêts pour une future persistance.

```tsx
import { useState } from "react";
import { TabSectionHeading } from "./TabSectionHeading";
import { ProjectDetailsCard } from "./ProjectDetailsCard";

// Forme de l'état géographique du projet.
// - country : code pays du <Select> pays (ISO majuscule, ex "FR")
// - address / city / postalCode : remplis via AddressAutocomplete
// - departmentCode / departmentName / region : dérivés de l'adresse,
//   non affichés à l'utilisateur ici, à persister plus tard en BDD
export interface ProjectLocationState {
  country: string;
  address: string;
  city: string;
  postalCode: string;
  departmentCode: string;
  departmentName: string;
  region: string;
}

const initialProjectLocation: ProjectLocationState = {
  country: "FR",
  address: "",
  city: "",
  postalCode: "",
  departmentCode: "",
  departmentName: "",
  region: "",
};

export function ProjectInfoForm() {
  // Nommé "projectLocation" et non "location" pour ne pas entrer en
  // conflit avec la variable "location" retournée par useLocation() de react-router.
  const [projectLocation, setProjectLocation] = useState<ProjectLocationState>(initialProjectLocation);

  return (
    <div className="space-y-8">
      <TabSectionHeading
        title="Informations sur votre projet"
        description="Décrivez les caractéristiques principales de votre future laverie"
      />
      <ProjectDetailsCard
        projectLocation={projectLocation}
        onProjectLocationChange={setProjectLocation}
      />
    </div>
  );
}
```

**Note :** `ProjectDetailsCard` doit à son tour propager les deux props à `LocationCard`. Petit changement de signature :

```tsx
// ProjectDetailsCard.tsx — modification minimale
interface Props {
  projectLocation: ProjectLocationState;
  onProjectLocationChange: (next: ProjectLocationState) => void;
}
export function ProjectDetailsCard({ projectLocation, onProjectLocationChange }: Props) {
  // ... même JSX, remplacer <LocationCard /> par :
  <LocationCard
    projectLocation={projectLocation}
    onProjectLocationChange={onProjectLocationChange}
  />
}
```

(Import de `ProjectLocationState` depuis `ProjectInfoForm`.)

---

## 4. `src/components/simulator/project/LocationCard.tsx` (modifié)

Passe en composant contrôlé. Le champ Adresse devient `AddressAutocomplete`. Ville et code postal deviennent contrôlés et automatiquement remplis. Le changement de pays reset les champs dépendants.

```tsx
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectGroup, SelectValue } from "@/components/ui/select";
import { Home, MapPin, Mailbox, Map, Globe } from "lucide-react";
import { FormField } from "./FormField";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { ZONE_TYPES, COUNTRIES } from "@/config/simulatorFormOptions";
import type { AddressSearchResult } from "@/hooks/useAddressSearch";
import type { ProjectLocationState } from "./ProjectInfoForm";

interface Props {
  projectLocation: ProjectLocationState;
  onProjectLocationChange: (next: ProjectLocationState) => void;
}

export function LocationCard({ projectLocation, onProjectLocationChange }: Props) {
  // Changement de pays -> on garde le pays, on reset les champs géo dépendants.
  const handleCountryChange = (value: string) => {
    onProjectLocationChange({
      ...projectLocation,
      // COUNTRIES.value est en minuscule ("fr"), on stocke en ISO majuscule
      // pour matcher l'attente du hook et de Nominatim.
      country: value.toUpperCase(),
      address: "",
      city: "",
      postalCode: "",
      departmentCode: "",
      departmentName: "",
      region: "",
    });
  };

  // Sélection d'une suggestion complète : remplit tous les champs dérivés.
  const handleAddressSelect = (r: AddressSearchResult) => {
    onProjectLocationChange({
      ...projectLocation,
      address: r.address,
      city: r.city,
      postalCode: r.postalCode,
      departmentCode: r.departmentCode,
      departmentName: r.departmentName,
      region: r.region,
    });
  };

  // Frappe libre : on met à jour uniquement "address" et on invalide
  // les champs auto-remplis tant que rien n'est sélectionné.
  const handleAddressInputChange = (value: string) => {
    onProjectLocationChange({
      ...projectLocation,
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
      <FormField label="Pays" htmlFor="country" icon={Globe} required>
        <Select
          value={projectLocation.country.toLowerCase()}
          onValueChange={handleCountryChange}
        >
          <SelectTrigger id="country" className="bg-white shadow-form">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.value}>
                  <span className="mr-2">{country.flag}</span>
                  {country.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Adresse du local"
        htmlFor="address"
        icon={Home}
        required
        hint="💡 Sélectionnez une adresse dans la liste pour remplir automatiquement la ville et le code postal"
      >
        <AddressAutocomplete
          id="address"
          value={projectLocation.address}
          country={projectLocation.country} // "FR" -> BAN, sinon Nominatim
          onSelect={handleAddressSelect}
          onInputChange={handleAddressInputChange}
        />
      </FormField>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Ville" htmlFor="city" icon={MapPin} required hint="Rempli automatiquement">
          <Input
            id="city"
            value={projectLocation.city}
            readOnly
            placeholder="Ex. : Paris"
            className="bg-white shadow-form opacity-70"
          />
        </FormField>
        <FormField label="Code postal" htmlFor="zip" icon={Mailbox} required hint="Rempli automatiquement">
          <Input
            id="zip"
            value={projectLocation.postalCode}
            readOnly
            placeholder="Ex. : 75004"
            className="bg-white shadow-form opacity-70"
          />
        </FormField>
      </div>

      <FormField label="Type de zone" htmlFor="zone" icon={Map} required>
        <Select>
          <SelectTrigger id="zone" className="bg-white shadow-form">
            <SelectValue placeholder="Sélectionnez un type de zone" />
          </SelectTrigger>
          <SelectContent>
            {ZONE_TYPES.map((z) => (
              <SelectItem key={z.value} value={z.value}>
                {z.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
}
```

---

## Validation après build

1. `bun run build` doit passer sans erreur TS.
2. Sur `/simulator/project`, pays = France → taper "10 rue de Rivoli" → cliquer suggestion → `address`, `city` = "Paris", `postalCode` = "75004" remplis automatiquement.
3. Changer le pays → tous les champs adresse/ville/CP se vident.
4. Pays = Belgique → taper "rue Neuve Bruxelles" → Nominatim renvoie des résultats, ville et CP se remplissent.
5. Ancienne page `/simulation` inchangée (composant `simulation/AddressAutocomplete.tsx` toujours utilisé par `StepProjectInfo.tsx`).

## Hors périmètre

- Pas de modification de l'ancienne page `/simulation` ni de ses composants.
- Pas de persistance en base des champs `departmentCode / departmentName / region` (uniquement en état React).
- Pas de i18n du message "Aucune adresse trouvée" (repris tel quel du legacy).
