import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, ChevronDown, MapPin, Check, PowerOff, LayoutGrid } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useActiveLaundromat } from "@/hooks/useActiveLaundromat";
import { cn } from "@/lib/utils";

interface LaundromatSelectorProps {
  variant?: "default" | "compact";
  showClosedToggle?: boolean;
  className?: string;
}

export function LaundromatSelector({ 
  variant = "default",
  showClosedToggle = false,
  className 
}: LaundromatSelectorProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language === "fr" ? "fr" : "en";
  const [showClosed, setShowClosed] = useState(false);
  
  const { 
    activeLaundromatId, 
    activeLaundromat, 
    sites, 
    isLoading, 
    setActiveLaundromatId,
    isAllLaundromats,
  } = useActiveLaundromat();

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 animate-pulse",
        variant === "compact" ? "h-8 w-24" : "h-10 w-40",
        className
      )}>
        <Building2 className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  // Filter sites
  const activeSites = sites.filter(s => s.status === "active");
  const closedSites = sites.filter(s => s.status === "closed");
  const hasMultipleSites = sites.length > 1;
  const hasClosedSites = closedSites.length > 0;

  // Single site - just display name, no selector needed
  if (!hasMultipleSites && activeSites.length === 1) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50",
        variant === "compact" && "px-2 py-1",
        className
      )}>
        <Building2 className={cn(
          "text-primary",
          variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"
        )} />
        <span className={cn(
          "font-medium text-foreground truncate max-w-[150px]",
          variant === "compact" ? "text-xs" : "text-sm"
        )}>
          {activeSites[0].name}
        </span>
      </div>
    );
  }

  // Multiple sites - show selector
  const displayValue = isAllLaundromats 
    ? (lang === "fr" ? "Toutes les laveries" : "All laundromats")
    : activeLaundromat?.name || (lang === "fr" ? "Sélectionner" : "Select");

  return (
    <Select
      value={activeLaundromatId || undefined}
      onValueChange={(value) => setActiveLaundromatId(value as string | "all")}
    >
      <SelectTrigger 
        className={cn(
          "border-border bg-background/80 hover:bg-accent/50 transition-colors",
          variant === "compact" 
            ? "h-8 px-2 text-xs gap-1 max-w-[140px]" 
            : "h-10 px-3 text-sm gap-2 max-w-[200px]",
          isAllLaundromats && "border-primary/30 bg-primary/5",
          className
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {isAllLaundromats ? (
            <LayoutGrid className={cn(
              "text-primary shrink-0",
              variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"
            )} />
          ) : (
            <Building2 className={cn(
              "text-primary shrink-0",
              variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"
            )} />
          )}
          <span className="truncate">{displayValue}</span>
          {activeLaundromat?.status === "closed" && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0 border-amber-300 text-amber-600 bg-amber-50">
              {lang === "fr" ? "Fermée" : "Closed"}
            </Badge>
          )}
        </div>
      </SelectTrigger>
      
      <SelectContent className="min-w-[220px] bg-popover border-border shadow-lg z-[100]">
        {/* All laundromats option */}
        <SelectItem value="all" className="cursor-pointer">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {lang === "fr" ? "Toutes les laveries" : "All laundromats"}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-auto">
              {activeSites.length}
            </Badge>
          </div>
        </SelectItem>

        {activeSites.length > 0 && <SelectSeparator />}
        
        {/* Active laundromats */}
        {activeSites.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground px-2">
              {lang === "fr" ? "Laveries actives" : "Active laundromats"}
            </SelectLabel>
            {activeSites.map((site) => (
              <SelectItem key={site.id} value={site.id} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{site.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* Closed laundromats */}
        {hasClosedSites && showClosed && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground px-2 flex items-center gap-1">
                <PowerOff className="h-3 w-3" />
                {lang === "fr" ? "Laveries fermées" : "Closed laundromats"}
              </SelectLabel>
              {closedSites.map((site) => (
                <SelectItem key={site.id} value={site.id} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground opacity-50" />
                    <span className="truncate text-muted-foreground">{site.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-300 text-amber-600 bg-amber-50 ml-auto">
                      {lang === "fr" ? "Fermée" : "Closed"}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}

        {/* Toggle closed visibility */}
        {hasClosedSites && (
          <>
            <SelectSeparator />
            <div 
              className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowClosed(!showClosed);
              }}
            >
              <PowerOff className="h-3 w-3" />
              {showClosed 
                ? (lang === "fr" ? "Masquer fermées" : "Hide closed")
                : (lang === "fr" ? `Afficher fermées (${closedSites.length})` : `Show closed (${closedSites.length})`)
              }
            </div>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
