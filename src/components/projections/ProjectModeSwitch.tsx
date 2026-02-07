import { useState } from "react";
import { AlertTriangle, Briefcase, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ProjectModeSwitchProps {
  projectId: string;
  currentMode: "side_income" | "main_project";
  disabled?: boolean;
}

export function ProjectModeSwitch({ projectId, currentMode, disabled }: ProjectModeSwitchProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(currentMode);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (selectedMode === currentMode) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("fin_projects")
        .update({
          project_mode: selectedMode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      if (error) throw error;

      // Add or remove manager salary hypothesis
      if (selectedMode === "main_project") {
        // Add manager salary if not exists
        const { data: existing } = await supabase
          .from("fin_hypotheses")
          .select("id")
          .eq("project_id", projectId)
          .eq("key", "manager_salary")
          .single();

        if (!existing) {
          await supabase.from("fin_hypotheses").insert({
            project_id: projectId,
            category: "COST",
            key: "manager_salary",
            value: 2000,
            label: "Rémunération dirigeant",
            unit: "€/mois",
            meta: {},
          });
        }
      } else {
        // Remove manager salary (set to 0 or delete)
        await supabase
          .from("fin_hypotheses")
          .update({ value: 0 })
          .eq("project_id", projectId)
          .eq("key", "manager_salary");
      }

      queryClient.invalidateQueries({ queryKey: ["fin-project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["fin-hypotheses", projectId] });
      
      toast({
        title: "Mode mis à jour",
        description: selectedMode === "side_income" 
          ? "Le projet est maintenant configuré comme complément de revenu."
          : "Le projet est maintenant configuré comme projet principal.",
      });
      
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="gap-2"
      >
        {currentMode === "side_income" ? (
          <>
            <Wallet className="h-4 w-4" />
            Complément de revenu
          </>
        ) : (
          <>
            <Briefcase className="h-4 w-4" />
            Projet principal
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mode du projet</DialogTitle>
            <DialogDescription>
              Ce paramètre influence les KPIs affichés et les hypothèses par défaut.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={selectedMode}
            onValueChange={v => setSelectedMode(v as typeof selectedMode)}
            className="space-y-3 my-4"
          >
            <div
              className={cn(
                "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                selectedMode === "side_income" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              )}
              onClick={() => setSelectedMode("side_income")}
            >
              <RadioGroupItem value="side_income" id="mode-side_income" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="mode-side_income" className="cursor-pointer flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="font-medium">Complément de revenu</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Recommandé</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Pas de rémunération dirigeant. KPIs orientés cash net et rentabilité passive.
                </p>
              </div>
            </div>

            <div
              className={cn(
                "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                selectedMode === "main_project" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              )}
              onClick={() => setSelectedMode("main_project")}
            >
              <RadioGroupItem value="main_project" id="mode-main_project" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="mode-main_project" className="cursor-pointer flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="font-medium">Projet principal</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Inclut rémunération dirigeant (2 000 €/mois par défaut) et KPIs avancés.
                </p>
              </div>
            </div>
          </RadioGroup>

          {selectedMode === "main_project" && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Attention</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  Vivre d'une laverie comme activité principale nécessite un volume élevé et des services complémentaires.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? "Mise à jour..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
