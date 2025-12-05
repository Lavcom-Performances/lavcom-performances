import { useNavigate } from "react-router-dom";
import { Building2, MapPin, ChevronRight } from "lucide-react";

// Mock data for V1
const mockLaundromats = [
  { id: "1", name: "Laverie Saint-Michel", address: "12 Rue Saint-Michel", city: "Paris 6e" },
  { id: "2", name: "Laverie Bastille", address: "45 Boulevard Voltaire", city: "Paris 11e" },
  { id: "3", name: "Laverie République", address: "8 Place de la République", city: "Paris 3e" },
];

export default function SelectLaundromat() {
  const navigate = useNavigate();

  const handleSelectLaundromat = (laundromatId: string) => {
    // TODO: Store selected laundromat in context/state
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Sélectionnez une laverie
          </h1>
          <p className="text-muted-foreground">
            Choisissez la laverie que vous souhaitez consulter
          </p>
        </div>

        <div className="space-y-3">
          {mockLaundromats.map((laundromat) => (
            <button
              key={laundromat.id}
              onClick={() => handleSelectLaundromat(laundromat.id)}
              className="w-full p-4 rounded-xl border-2 transition-all duration-200 text-left flex items-center justify-between group border-border bg-card hover:border-primary hover:shadow-lavcom"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{laundromat.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{laundromat.address}, {laundromat.city}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 transition-colors text-muted-foreground group-hover:text-primary" />
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          L'upload de fichiers CSV se fait depuis le menu <strong>Imports</strong> après avoir sélectionné une laverie.
        </p>
      </div>
    </div>
  );
}
