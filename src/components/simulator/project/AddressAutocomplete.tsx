import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAddressSearch, type AddressSearchResult } from "@/hooks/useAddressSearch";

interface Props {
  value: string;
  countryCode: string;
  onSelect: (result: AddressSearchResult) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  id?: string;
}

export function AddressAutocomplete({
  value,
  countryCode,
  onSelect,
  onInputChange,
  placeholder = "Tapez et sélectionnez une adresse...",
  className,
  hasError,
  id,
}: Props) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, isLoading } = useAddressSearch(
    justSelected || !isUserTyping ? "" : inputValue,
    3,
    countryCode,
  );

  useEffect(() => {
    setInputValue((prev) => (prev === value ? prev : value));
  }, [value]);

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
    const value = e.target.value;
    setInputValue(value);
    setJustSelected(false);
    setIsUserTyping(true);
    setIsOpen(true);
    onInputChange?.(value);
  };

  const handleSelect = (result: AddressSearchResult) => {
    setInputValue(result.address);
    setJustSelected(true);
    setIsUserTyping(false);
    setIsOpen(false);
    onSelect(result);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
        <Input
          id={id}
          value={inputValue}
          onChange={handleChange}
          onFocus={() => inputValue.length >= 3 && setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "bg-white shadow-form",
            hasError && "border-destructive focus-visible:ring-destructive",
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((result, index) => (
            <button
              key={`${result.postalCode}-${result.address}-${index}`}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
            >
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{result.label}</span>
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
