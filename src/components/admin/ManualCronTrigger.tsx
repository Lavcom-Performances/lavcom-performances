import { useState } from "react";
import { Play, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ManualCronTriggerProps {
  onSuccess?: () => void;
}

export function ManualCronTrigger({ onSuccess }: ManualCronTriggerProps) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const triggerCron = async () => {
    setIsTriggering(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("compute-analytics-cron", {
        method: "POST",
      });

      if (error) {
        throw new Error(error.message || "Erreur lors du déclenchement");
      }

      const result = {
        success: true,
        message: `Cron exécuté: ${data?.sites_processed || 0} sites traités, ${data?.sites_failed || 0} échecs (${data?.duration_ms || 0}ms)`,
      };
      
      setLastResult(result);
      toast({
        title: "Cron déclenché avec succès",
        description: result.message,
      });
      
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      
      // Check for rate limit error
      if (errorMessage.includes("429") || errorMessage.includes("rate")) {
        setLastResult({
          success: false,
          message: "Rate limit atteint. Veuillez réessayer plus tard.",
        });
        toast({
          title: "Rate limit",
          description: "Le cron est limité en fréquence. Réessayez dans quelques minutes.",
          variant: "destructive",
        });
      } else {
        setLastResult({
          success: false,
          message: errorMessage,
        });
        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="default" 
            size="sm"
            disabled={isTriggering}
            className="gap-2"
          >
            {isTriggering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Déclencher manuellement
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Déclencher le cron manuellement ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va lancer le calcul des analytics pour tous les sites actifs.
              Cela peut prendre plusieurs minutes selon le nombre de sites.
              <br /><br />
              <strong>Note :</strong> Le cron est limité à une exécution toutes les 5 minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={triggerCron} disabled={isTriggering}>
              {isTriggering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Exécution...
                </>
              ) : (
                "Déclencher"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {lastResult && (
        <div className={`flex items-center gap-2 text-sm ${
          lastResult.success ? "text-emerald-600" : "text-destructive"
        }`}>
          {lastResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span className="max-w-md truncate">{lastResult.message}</span>
        </div>
      )}
    </div>
  );
}
