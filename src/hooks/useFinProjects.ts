import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFinAccess } from "./useFinAccess";

export interface FinProject {
  id: string;
  workspace_id: string;
  name: string;
  project_type: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useFinProjects() {
  const { access } = useFinAccess();
  
  return useQuery({
    queryKey: ["fin-projects"],
    queryFn: async (): Promise<FinProject[]> => {
      const { data, error } = await supabase
        .from("fin_projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FinProject[];
    },
    enabled: !!access?.has_access,
  });
}

export function useFinProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["fin-project", projectId],
    queryFn: async (): Promise<FinProject> => {
      if (!projectId) throw new Error("No project ID");
      const { data, error } = await supabase
        .from("fin_projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data as FinProject;
    },
    enabled: !!projectId,
  });
}

export function useCreateFinProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { access } = useFinAccess();

  return useMutation({
    mutationFn: async (data: { name: string; project_type: string; description?: string }) => {
      if (!access?.workspace_id) {
        throw new Error("Aucun espace de travail disponible");
      }
      
      const { data: project, error } = await supabase
        .from("fin_projects")
        .insert({
          workspace_id: access.workspace_id,
          name: data.name,
          project_type: data.project_type,
          description: data.description || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["fin-access"] });
      toast({ title: "Projet créé", description: "Votre projet a été créé avec succès." });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useDeleteFinProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("fin_projects")
        .delete()
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["fin-access"] });
      toast({ title: "Projet supprimé" });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}
