/**
 * TAEX-306: Structured Beta Feedback Dialog
 * 
 * Simple, structured feedback form with topic/sentiment/message.
 * Submission stores in beta_feedback table.
 */
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBetaOnboarding } from "@/hooks/useBetaOnboarding";
import { useBetaChecklistComplete } from "@/components/beta/BetaChecklistTracker";
import { Loader2, ThumbsUp, Minus, ThumbsDown } from "lucide-react";

const feedbackSchema = z.object({
  topic: z.enum(["data_import", "kpis_dashboards", "financial_projections", "ux_navigation", "onboarding", "other"]),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  message: z.string().max(2000).optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface StructuredFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const topicOptions = [
  { value: "data_import", label: "Import de données" },
  { value: "kpis_dashboards", label: "KPIs / Tableaux de bord" },
  { value: "financial_projections", label: "Projections financières" },
  { value: "ux_navigation", label: "UX / Navigation" },
  { value: "onboarding", label: "Compréhension / Onboarding" },
  { value: "other", label: "Autre" },
];

const sentimentOptions = [
  { value: "positive", label: "Positif", icon: ThumbsUp, color: "text-green-600" },
  { value: "neutral", label: "Neutre", icon: Minus, color: "text-muted-foreground" },
  { value: "negative", label: "Négatif", icon: ThumbsDown, color: "text-destructive" },
];

export function StructuredFeedbackDialog({ open, onOpenChange }: StructuredFeedbackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { companyId } = useBetaOnboarding();
  const { complete: completeChecklistItem } = useBetaChecklistComplete();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      topic: "ux_navigation",
      sentiment: "neutral",
      message: "",
    },
  });

  const onSubmit = async (data: FeedbackFormData) => {
    if (!user?.id || !companyId) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour envoyer un feedback.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("beta_feedback").insert({
        company_id: companyId,
        user_id: user.id,
        topic: data.topic,
        sentiment: data.sentiment,
        message: data.message || null,
        page_context: location.pathname,
      });

      if (error) throw error;

      toast({
        title: "Merci pour votre retour !",
        description: "Votre feedback a été enregistré.",
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Topic */}
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sujet</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {topicOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sentiment */}
            <FormField
              control={form.control}
              name="sentiment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sentiment</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      {sentimentOptions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={option.value} />
                          <Label
                            htmlFor={option.value}
                            className={`flex items-center gap-1.5 cursor-pointer ${option.color}`}
                          >
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message (optional) */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Message <span className="text-muted-foreground font-normal">(optionnel)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez votre retour..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Page context (read-only) */}
            <div className="text-xs text-muted-foreground">
              Page : <code className="bg-muted px-1 py-0.5 rounded">{location.pathname}</code>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
