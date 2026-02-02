import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLaundromat } from "@/hooks/useActiveLaundromat";
import { useBetaChecklistComplete } from "@/components/beta/BetaChecklistTracker";
import { Loader2, Bug, HelpCircle, Lightbulb } from "lucide-react";

const feedbackSchema = z.object({
  message: z.string().min(10, "Message trop court (10 caractères min.)").max(2000),
  type: z.enum(["bug", "confusion", "suggestion"]),
  urgency: z.enum(["low", "medium", "high"]),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface BetaFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeOptions = [
  { value: "bug", label: "Bug / Erreur", icon: Bug, color: "text-destructive" },
  { value: "confusion", label: "Confusion / Clarté", icon: HelpCircle, color: "text-amber-500" },
  { value: "suggestion", label: "Suggestion", icon: Lightbulb, color: "text-primary" },
];

const urgencyOptions = [
  { value: "low", label: "Faible", color: "bg-muted" },
  { value: "medium", label: "Moyenne", color: "bg-amber-500/20" },
  { value: "high", label: "Élevée", color: "bg-destructive/20" },
];

export function BetaFeedbackDialog({ open, onOpenChange }: BetaFeedbackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const { activeLaundromatId } = useActiveLaundromat();
  const { complete: completeChecklistItem } = useBetaChecklistComplete();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      message: "",
      type: "suggestion",
      urgency: "medium",
    },
  });

  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-beta-feedback", {
        body: {
          message: data.message,
          type: data.type,
          urgency: data.urgency,
          route: location.pathname,
          active_laundromat_id: activeLaundromatId,
        },
      });

      if (error) throw error;

      toast({
        title: "Merci pour votre retour !",
        description: "Nous l'examinerons rapidement.",
      });

      // Complete the feedback checklist item
      completeChecklistItem("send_feedback");

      form.reset();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre retour. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Donner un retour</DialogTitle>
          <DialogDescription>
            Aidez-nous à améliorer la plateforme. Votre retour est précieux.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de retour</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className={`h-4 w-4 ${option.color}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urgence</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {urgencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${option.color}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez votre retour..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Envoyer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
