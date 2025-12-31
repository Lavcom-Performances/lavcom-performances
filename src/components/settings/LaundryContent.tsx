import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Settings, ArrowRight } from "lucide-react";
import { useSites } from "@/hooks/useSites";

export default function LaundryContent() {
  const navigate = useNavigate();
  const { sites, isLoading: loading } = useSites();

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Vos laveries
          </CardTitle>
          <CardDescription>
            Gérez les paramètres de vos laveries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">Aucune laverie</h3>
              <p className="text-muted-foreground mb-4">
                Créez votre première laverie pour commencer
              </p>
              <Button onClick={() => navigate("/select-laundromat")}>
                Ajouter une laverie
              </Button>
            </div>
          ) : (
            <>
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/laundromat-settings?site=${site.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{site.name}</h3>
                      {site.city && (
                        <p className="text-sm text-muted-foreground">{site.city}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
              <div className="pt-4">
                <Button variant="outline" onClick={() => navigate("/select-laundromat")}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Ajouter une laverie
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
