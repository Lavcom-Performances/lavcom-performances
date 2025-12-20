import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Loader2 } from "lucide-react";
import { Site } from "@/hooks/useSites";

interface SiteSelectorProps {
  sites: Site[];
  selectedSiteId: string | null;
  onSiteChange: (siteId: string) => void;
  onCreateSite?: (name: string) => Promise<Site>;
  isLoading?: boolean;
}

export function SiteSelector({
  sites,
  selectedSiteId,
  onSiteChange,
  onCreateSite,
  isLoading = false,
}: SiteSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSite = async () => {
    if (!newSiteName.trim() || !onCreateSite) return;

    setIsCreating(true);
    try {
      const newSite = await onCreateSite(newSiteName.trim());
      onSiteChange(newSite.id);
      setNewSiteName("");
      setShowCreate(false);
    } catch (error) {
      console.error("Error creating site:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des laveries...
      </div>
    );
  }

  // If no sites, show create form
  if (sites.length === 0 || showCreate) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {sites.length === 0 ? "Créez votre première laverie" : "Nouvelle laverie"}
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="Nom de la laverie"
            value={newSiteName}
            onChange={(e) => setNewSiteName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateSite()}
          />
          <Button
            onClick={handleCreateSite}
            disabled={!newSiteName.trim() || isCreating}
            className="bg-lavcom-green hover:bg-lavcom-green-dark text-white shrink-0"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
          {sites.length > 0 && (
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium flex items-center gap-1.5">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        Laverie cible
      </label>
      <div className="flex gap-2">
        <Select value={selectedSiteId || ""} onValueChange={onSiteChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Sélectionnez une laverie" />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
                {site.is_default && " (par défaut)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onCreateSite && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowCreate(true)}
            title="Ajouter une laverie"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
