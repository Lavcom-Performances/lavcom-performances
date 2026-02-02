import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Settings, ArrowRight, Lock, PowerOff } from "lucide-react";
import { useSites } from "@/hooks/useSites";
import { useCurrentUserPermissions } from "@/hooks/useCurrentUserPermissions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function LaundryContent() {
  const navigate = useNavigate();
  const { permissions } = useCurrentUserPermissions();
  const { sites, isLoading: loading, fetchSites } = useSites();
  const [showClosed, setShowClosed] = useState(false);

  // Refetch sites when showClosed changes
  useEffect(() => {
    fetchSites(showClosed);
  }, [showClosed]);

  const activeSites = sites.filter(s => s.status !== 'closed');
  const closedSites = sites.filter(s => s.status === 'closed');

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Vos laveries
              </CardTitle>
              <CardDescription>
                Gérez les paramètres de vos laveries
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="show-closed" 
                checked={showClosed} 
                onCheckedChange={(checked) => setShowClosed(checked === true)}
              />
              <Label htmlFor="show-closed" className="text-sm cursor-pointer">
                Afficher les laveries fermées
              </Label>
            </div>
          </div>
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
              <h3 className="font-medium text-lg mb-2">
                {showClosed ? "Aucune laverie" : "Aucune laverie active"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {showClosed 
                  ? "Créez votre première laverie pour commencer"
                  : "Créez une nouvelle laverie ou affichez les laveries fermées"}
              </p>
              <Button onClick={() => navigate("/select-laundromat")}>
                Ajouter une laverie
              </Button>
            </div>
          ) : (
            <>
              {/* Active sites */}
              {activeSites.map((site) => (
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

              {/* Closed sites (only shown when toggle is on) */}
              {showClosed && closedSites.length > 0 && (
                <>
                  {closedSites.map((site) => (
                    <div
                      key={site.id}
                      className="flex items-center justify-between p-4 border border-amber-200 rounded-lg hover:bg-amber-50/50 transition-colors cursor-pointer bg-amber-50/30"
                      onClick={() => navigate(`/laundromat-settings?site=${site.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <PowerOff className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-amber-900">{site.name}</h3>
                            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                              Fermée
                            </Badge>
                          </div>
                          {site.city && (
                            <p className="text-sm text-amber-700">{site.city}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-amber-600" />
                        <ArrowRight className="h-4 w-4 text-amber-600" />
                      </div>
                    </div>
                  ))}
                </>
              )}

              <div className="pt-4">
                {permissions.can_edit_sites ? (
                  <Button variant="outline" onClick={() => navigate("/select-laundromat")}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Ajouter une laverie
                  </Button>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" disabled className="opacity-50 cursor-not-allowed">
                          <Lock className="h-4 w-4 mr-2" />
                          Ajouter une laverie
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Vous n'avez pas la permission d'ajouter des laveries</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
