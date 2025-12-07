import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, MapPin, ChevronRight, Plus, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface Laundromat {
  id: string;
  name: string;
  address: string;
  city: string;
}

// Mock data for V1
const initialLaundromats: Laundromat[] = [
  { id: "1", name: "Laverie Saint-Michel", address: "12 Rue Saint-Michel", city: "Paris 6e" },
  { id: "2", name: "Laverie Bastille", address: "45 Boulevard Voltaire", city: "Paris 11e" },
  { id: "3", name: "Laverie République", address: "8 Place de la République", city: "Paris 3e" },
];

export default function SelectLaundromat() {
  const navigate = useNavigate();
  const [laundromats, setLaundromats] = useState<Laundromat[]>(initialLaundromats);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLaundromat, setNewLaundromat] = useState({
    name: "",
    address: "",
    city: "",
  });

  const handleSelectLaundromat = (laundromatId: string) => {
    // TODO: Store selected laundromat in context/state
    navigate("/dashboard");
  };

  const handleAddLaundromat = () => {
    if (!newLaundromat.name || !newLaundromat.address || !newLaundromat.city) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      });
      return;
    }

    const newEntry: Laundromat = {
      id: String(Date.now()),
      name: newLaundromat.name,
      address: newLaundromat.address,
      city: newLaundromat.city,
    };

    setLaundromats(prev => [...prev, newEntry]);
    setNewLaundromat({ name: "", address: "", city: "" });
    setIsDialogOpen(false);
    
    toast({
      title: "Laverie ajoutée",
      description: `${newEntry.name} a été ajoutée avec succès.`,
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl space-y-6 sm:space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            Sélectionnez une laverie
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Choisissez la laverie que vous souhaitez consulter
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter une laverie
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nouvelle laverie</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="laundry-name">Nom de la laverie</Label>
                  <Input
                    id="laundry-name"
                    placeholder="Ex: Laverie Montmartre"
                    value={newLaundromat.name}
                    onChange={(e) => setNewLaundromat(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="laundry-address">Adresse</Label>
                  <Input
                    id="laundry-address"
                    placeholder="Ex: 25 Rue des Abbesses"
                    value={newLaundromat.address}
                    onChange={(e) => setNewLaundromat(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="laundry-city">Ville</Label>
                  <Input
                    id="laundry-city"
                    placeholder="Ex: Paris 18e"
                    value={newLaundromat.city}
                    onChange={(e) => setNewLaundromat(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <Button onClick={handleAddLaundromat} className="w-full">
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => navigate("/company-settings")}
          >
            <Settings className="h-4 w-4" />
            Paramètres entreprise
          </Button>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {laundromats.map((laundromat) => (
            <button
              key={laundromat.id}
              onClick={() => handleSelectLaundromat(laundromat.id)}
              className="w-full p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 text-left flex items-center justify-between group border-border bg-card hover:border-primary hover:shadow-lavcom"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-colors shrink-0 bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{laundromat.name}</h3>
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{laundromat.address}, {laundromat.city}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 transition-colors shrink-0 text-muted-foreground group-hover:text-primary" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs sm:text-sm text-muted-foreground px-2">
          L'upload de fichiers CSV se fait depuis le menu <strong>Imports</strong> après avoir sélectionné une laverie.
        </p>
      </div>
    </div>
  );
}
