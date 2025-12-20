import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

interface Site {
  id: string;
  name: string;
}

interface SiteSelectorProps {
  sites: Site[];
  selectedSiteId: string | null;
  onSiteChange: (siteId: string) => void;
}

export function SiteSelector({ sites, selectedSiteId, onSiteChange }: SiteSelectorProps) {
  if (sites.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium flex items-center gap-1.5">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        Laverie cible
      </label>
      <Select value={selectedSiteId || ""} onValueChange={onSiteChange}>
        <SelectTrigger>
          <SelectValue placeholder="Sélectionnez une laverie" />
        </SelectTrigger>
        <SelectContent>
          {sites.map((site) => (
            <SelectItem key={site.id} value={site.id}>
              {site.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
