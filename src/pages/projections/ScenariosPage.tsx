import { useSearchParams } from "react-router-dom";
import { GitBranch, Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinProject } from "@/hooks/useFinProjects";
import { useFinAccess } from "@/hooks/useFinAccess";

export default function ScenariosPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  
  const { access } = useFinAccess();
  const { data: project } = useFinProject(projectId || undefined);
  
  const maxScenarios = access?.max_scenarios || 1;
  const isLimited = maxScenarios <= 1;

  if (!projectId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sélectionnez un projet pour gérer ses scénarios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scénarios</h1>
          <p className="text-muted-foreground">
            {project?.name} — Comparez différentes hypothèses
          </p>
        </div>
        
        {!isLimited && (
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau scénario
          </Button>
        )}
      </div>

      {isLimited ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Fonctionnalité verrouillée</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              La comparaison de scénarios est disponible avec les packs Projet et Comparateur. 
              Passez à un pack supérieur pour créer plusieurs scénarios et les comparer.
            </p>
            <Button variant="outline" asChild>
              <a href="/subscribe-simulator">Voir les packs</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Scénario de base
            </CardTitle>
            <CardDescription>
              Ce scénario utilise les hypothèses définies dans l'onglet Hypothèses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Fonctionnalité en cours de développement. 
              Bientôt vous pourrez créer des variantes et comparer les résultats.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
