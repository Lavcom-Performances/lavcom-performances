import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileUp, FileDown, FolderOpen, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DataSecurityBadge } from "@/components/trust/DataSecurityBadge";

/**
 * TAEX-304: User Data History Page
 * Shows imports, exports, projects, and major actions for transparency
 */
export default function DataHistoryPage() {
  const { user } = useAuth();
  const { currentSiteId } = useCurrentSite();
  const [activeTab, setActiveTab] = useState("imports");

  // Fetch import history
  const { data: imports, isLoading: importsLoading } = useQuery({
    queryKey: ["data-history-imports", currentSiteId],
    queryFn: async () => {
      if (!currentSiteId) return [];
      const { data, error } = await supabase
        .from("import_batches")
        .select("*")
        .eq("site_id", currentSiteId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentSiteId,
  });

  // Fetch export history
  const { data: exports, isLoading: exportsLoading } = useQuery({
    queryKey: ["data-history-exports", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("export_jobs")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch fin_projects history
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["data-history-projects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("fin_projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMM yyyy 'à' HH:mm", { locale: fr });
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historique de vos données</h1>
          <p className="text-muted-foreground mt-1">
            Consultez l'historique de vos imports, exports et projets
          </p>
        </div>
        <DataSecurityBadge variant="inline" />
      </div>

      {/* Trust Statement Card */}
      <DataSecurityBadge variant="card" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="imports" className="gap-2">
            <FileUp className="h-4 w-4" />
            Imports
          </TabsTrigger>
          <TabsTrigger value="exports" className="gap-2">
            <FileDown className="h-4 w-4" />
            Exports
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Projections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="imports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5" />
                Historique des imports
              </CardTitle>
              <CardDescription>
                Tous les fichiers importés sur ce site
              </CardDescription>
            </CardHeader>
            <CardContent>
              {importsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : imports && imports.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {imports.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileUp className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{item.filename}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(item.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {item.imported_rows} lignes
                          </Badge>
                          {item.ignored_rows > 0 && (
                            <Badge variant="outline" className="text-amber-600">
                              {item.ignored_rows} ignorées
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun import pour ce site</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                Historique des exports
              </CardTitle>
              <CardDescription>
                Tous vos exports de données
              </CardDescription>
            </CardHeader>
            <CardContent>
              {exportsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : exports && exports.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {exports.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center">
                            <FileDown className="h-5 w-5 text-accent-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{item.export_type}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(item.created_at)}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={
                            item.status === "completed" ? "default" :
                            item.status === "failed" ? "destructive" :
                            "secondary"
                          }
                        >
                          {item.status === "completed" ? "Terminé" :
                           item.status === "failed" ? "Échoué" :
                           item.status === "processing" ? "En cours" :
                           item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun export</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Projections financières
              </CardTitle>
              <CardDescription>
                Historique de vos projets de prévisionnel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : projects && projects.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {projects.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            <FolderOpen className="h-5 w-5 text-secondary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(item.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {item.project_type === "creation" ? "Création" :
                             item.project_type === "reprise" ? "Reprise" :
                             item.project_type === "extension" ? "Extension" :
                             item.project_type}
                          </Badge>
                          <Badge
                            variant={item.status === "ACTIVE" ? "default" : "secondary"}
                          >
                            {item.status === "ACTIVE" ? "Actif" :
                             item.status === "ARCHIVED" ? "Archivé" :
                             item.status === "DRAFT" ? "Brouillon" :
                             item.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun projet de projection</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
