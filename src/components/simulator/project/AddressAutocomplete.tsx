import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAddressSearch, type AddressSearchResult } from "@/hooks/useAddressSearch";

interface Props {
  // Valeur affichée dans l'input (contrôlée par le parent).
  value: string;
  // Code pays ISO ("FR", "BE", ...). Pilote le choix de l'API (BAN vs Nominatim).
  country: string;
  // Callback déclenché quand l'utilisateur clique une suggestion.
  onSelect: (result: AddressSearchResult) => void;
  // Callback optionnel pour suivre la frappe libre — permet au parent
  // d'invalider city/postalCode tant que rien n'est sélectionné.
  onInputChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  id?: string;
}

/**
 * Autocomplétion d'adresse dédiée au simulateur (`/simulator/project`).
 * Isolée du composant legacy `src/components/simulation/AddressAutocomplete.tsx`.
 * Utilise le hook unifié `useAddressSearch` (BAN en FR, Nominatim ailleurs).
 */
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
  // Empêche la ré-ouverture de la liste juste après une sélection.
  const [justSelected, setJustSelected] = useState(false);
  // Évite de relancer une recherche lorsque la valeur vient des props (reset pays, etc.).
  const [isUserTyping, setIsUserTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Un seul hook — un seul routage FR / international.
  const { results, isLoading } = useAddressSearch(
    justSelected || !isUserTyping ? "" : inputValue,
    3,
    country,
  );

  // Sync quand le parent modifie la valeur (ex. reset au changement de pays).
  useEffect(() => {
    setInputValue(value);
    setIsUserTyping(false);
  }, [value]);

  // Fermeture au clic à l'extérieur.
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
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          value={inputValue}
          onChange={handleChange}
          onFocus={() => inputValue.length >= 3 && setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
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

      {isOpen &&
        inputValue.length >= 3 &&
        !isLoading &&
        results.length === 0 &&
        isUserTyping &&
        !justSelected && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
            Aucune adresse trouvée. Essayez avec le nom de la ville.
          </div>
        )}
    </div>
  );
}
