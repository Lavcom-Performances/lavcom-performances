import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFinAccess } from "./useFinAccess";

export type ProjectMode = "side_income" | "main_project";

export interface QuestionnaireData {
  city: string;
  country: string;
  surface_size: "small" | "medium" | "large";
  machine_count_range: "1-4" | "5-8" | "9-14" | "15+";
  pricing_tier: "economic" | "standard" | "premium";
  project_mode: ProjectMode;
  has_loan: boolean;
  contribution_amount: number;
}

export interface FinProject {
  id: string;
  workspace_id: string;
  name: string;
  project_type: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  description: string | null;
  project_mode: ProjectMode;
  questionnaire_completed: boolean;
  questionnaire_data: QuestionnaireData | null | unknown;
  vat_rate: number;
  vat_frequency: string;
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
  const { access, refetch: refetchAccess } = useFinAccess();

  return useMutation({
    mutationFn: async (data: { name: string; project_type: string; description?: string }) => {
      // If no workspace, try to refetch access (might trigger workspace auto-creation for super admin)
      let workspaceId = access?.workspace_id;
      
      if (!workspaceId) {
        // Force refetch to potentially create workspace for super admin
        const refreshedAccess = await refetchAccess();
        workspaceId = refreshedAccess.data?.workspace_id;
      }
      
      if (!workspaceId) {
        throw new Error("Aucun espace de travail disponible. Veuillez rafraîchir la page.");
      }
      
      const { data: project, error } = await supabase
        .from("fin_projects")
        .insert({
          workspace_id: workspaceId,
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
