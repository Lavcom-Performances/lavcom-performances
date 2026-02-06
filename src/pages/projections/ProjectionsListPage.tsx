import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, MoreVertical, Trash2, FolderOpen, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFinAccess } from "@/hooks/useFinAccess";
import { useFinProjects, useCreateFinProject, useDeleteFinProject } from "@/hooks/useFinProjects";
import { useInitializeHypotheses } from "@/hooks/useFinHypotheses";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const PROJECT_TYPES = [
  { value: "creation", label: "Création", description: "Nouveau projet de laverie" },
  { value: "reprise", label: "Reprise", description: "Reprise d'une laverie existante" },
  { value: "extension", label: "Extension", description: "Agrandissement d'une laverie" },
];

export default function ProjectionsListPage() {
  const navigate = useNavigate();
  const { access, isLoading: accessLoading } = useFinAccess();
  const { data: projects, isLoading: projectsLoading } = useFinProjects();
  const createProject = useCreateFinProject();
  const deleteProject = useDeleteFinProject();
  const initHypotheses = useInitializeHypotheses();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectType, setNewProjectType] = useState("creation");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    
    const result = await createProject.mutateAsync({
      name: newProjectName.trim(),
      project_type: newProjectType,
    });
    
    // Initialize default hypotheses
    if (result?.id) {
      await initHypotheses.mutateAsync(result.id);
      setIsCreateOpen(false);
      setNewProjectName("");
      setNewProjectType("creation");
      navigate(`/projections/hypotheses?project=${result.id}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteProject.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!access?.has_access && access?.reason === "no_workspace") {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Accès à l'outil de projection</h2>
        <p className="text-muted-foreground mb-6">
          Créez, comparez et exportez des prévisionnels complets pour présenter votre projet 
          à un banquier ou un expert-comptable.
        </p>
        <Button size="lg" asChild>
          <Link to="/subscribe-simulator">Obtenir un accès</Link>
        </Button>
      </div>
    );
  }

  const canCreate = access?.can_create_project;
  const isReadOnly = access?.read_only;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes projets</h1>
          <p className="text-muted-foreground">
            {projects?.length || 0} projet(s) • {access?.current_projects}/{access?.max_projects} utilisé(s)
          </p>
        </div>
        
        {canCreate && !isReadOnly && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau projet
          </Button>
        )}
      </div>

      {projectsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun projet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Créez votre premier projet de prévisionnel financier
            </p>
            {canCreate && !isReadOnly && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un projet
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map(project => (
            <Card 
              key={project.id} 
              className={cn(
                "group cursor-pointer transition-shadow hover:shadow-md",
                project.status === "ARCHIVED" && "opacity-60"
              )}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <Link 
                  to={`/projections/hypotheses?project=${project.id}`}
                  className="flex-1"
                >
                  <CardTitle className="text-lg flex items-center gap-2">
                    {project.name}
                    {project.status === "ARCHIVED" && (
                      <Archive className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {PROJECT_TYPES.find(t => t.value === project.project_type)?.label || project.project_type}
                    {" • "}
                    {format(new Date(project.created_at), "d MMM yyyy", { locale: fr })}
                  </CardDescription>
                </Link>
                
                {!isReadOnly && project.status !== "ARCHIVED" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteConfirmId(project.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
            <DialogDescription>
              Créez un prévisionnel financier pour votre projet de laverie.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du projet</Label>
              <Input
                id="name"
                placeholder="Ma nouvelle laverie"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Type de projet</Label>
              <RadioGroup value={newProjectType} onValueChange={setNewProjectType}>
                {PROJECT_TYPES.map(type => (
                  <div key={type.value} className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value={type.value} id={type.value} />
                    <Label htmlFor={type.value} className="font-normal cursor-pointer">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-muted-foreground ml-2">— {type.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!newProjectName.trim() || createProject.isPending}
            >
              {createProject.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le projet ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes les données du projet seront perdues.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
