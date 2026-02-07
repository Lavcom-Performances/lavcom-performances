/**
 * Page-by-page UX clarity questionnaire.
 * 
 * Triggered on first visit only, non-blocking.
 * Question 1: "Cette page était claire et facile à comprendre."
 * Question 2 (conditional): "Quel était le problème ?"
 */
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ThumbsUp, Meh, ThumbsDown, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBetaOnboarding } from "@/hooks/useBetaOnboarding";
import { useUxFeedback } from "@/hooks/useUxFeedback";
import { cn } from "@/lib/utils";

type ClarityScore = "clear" | "partial" | "unclear";
type IssueType = "understanding" | "complexity" | "missing_explanation" | "technical" | "other";

const clarityOptions = [
  { value: "clear" as ClarityScore, label: "Oui, tout était clair", icon: ThumbsUp, color: "text-green-600 hover:text-green-700" },
  { value: "partial" as ClarityScore, label: "Partiellement", icon: Meh, color: "text-amber-600 hover:text-amber-700" },
  { value: "unclear" as ClarityScore, label: "Non / Bloquant", icon: ThumbsDown, color: "text-destructive hover:text-destructive/80" },
];

const issueOptions = [
  { value: "understanding" as IssueType, label: "Je n'ai pas compris certaines informations" },
  { value: "complexity" as IssueType, label: "Trop complexe" },
  { value: "missing_explanation" as IssueType, label: "Manque d'explications" },
  { value: "technical" as IssueType, label: "Problème technique" },
  { value: "other" as IssueType, label: "Autre" },
];

interface UxClarityQuestionProps {
  /**
   * If true, enables the questionnaire on this page.
   * Should be used sparingly on key pages.
   */
  enabled?: boolean;
}

export function UxClarityQuestion({ enabled = true }: UxClarityQuestionProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { companyId } = useBetaOnboarding();
  const { shouldShow, dismiss, markAsShown } = useUxFeedback(location.pathname);

  const [clarityScore, setClarityScore] = useState<ClarityScore | null>(null);
  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Don't show if disabled, already shown, or no user
  if (!enabled || !shouldShow) {
    return null;
  }

  const handleClaritySelect = (value: ClarityScore) => {
    setClarityScore(value);
    if (value === "clear") {
      // Submit immediately for positive feedback
      handleSubmit(value);
    } else {
      // Show follow-up question
      setStep(2);
    }
  };

  const handleSubmit = async (scoreOverride?: ClarityScore) => {
    const score = scoreOverride || clarityScore;
    if (!score) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("ux_feedback").insert({
        page_path: location.pathname,
        user_id: user?.id || null,
        company_id: companyId || null,
        user_role: user ? "authenticated" : "guest",
        clarity_score: score,
        issue_type: issueType,
        message: message.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Merci pour votre retour !",
        description: "Votre avis nous aide à améliorer la plateforme.",
      });

      markAsShown();
    } catch (err) {
      console.error("Failed to submit UX feedback:", err);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre retour.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-4 right-4 z-50 w-full max-w-sm"
      >
        <div className="bg-card border rounded-lg shadow-lg p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm font-medium text-foreground pr-4">
              {step === 1
                ? "Cette page était claire et facile à comprendre ?"
                : "Quel était le problème ?"}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={dismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Step 1: Clarity selection */}
          {step === 1 && (
            <div className="flex gap-2">
              {clarityOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleClaritySelect(option.value)}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 flex-col h-auto py-2 gap-1",
                    option.color
                  )}
                >
                  {isSubmitting && clarityScore === option.value ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <option.icon className="h-5 w-5" />
                  )}
                  <span className="text-xs">{option.label}</span>
                </Button>
              ))}
            </div>
          )}

          {/* Step 2: Issue type and message */}
          {step === 2 && (
            <div className="space-y-3">
              <RadioGroup
                value={issueType || undefined}
                onValueChange={(v) => setIssueType(v as IssueType)}
                className="space-y-1"
              >
                {issueOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`issue-${option.value}`} />
                    <Label
                      htmlFor={`issue-${option.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {issueType === "other" && (
                <Textarea
                  placeholder="Décrivez le problème..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                />
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting || !issueType}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Envoyer
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Votre avis nous aide à améliorer Lavcom
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
