/**
 * TAEX-306: Structured Beta Feedback Button
 * 
 * Entry point for beta users to submit structured feedback.
 * Can be placed in footer or /beta area.
 */
import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StructuredFeedbackDialog } from "./StructuredFeedbackDialog";
import { useIsBetaCompany } from "@/hooks/useIsBetaCompany";

interface StructuredFeedbackButtonProps {
  variant?: "default" | "link" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showOnlyForBeta?: boolean;
}

export function StructuredFeedbackButton({ 
  variant = "ghost",
  size = "sm",
  className,
  showOnlyForBeta = true,
}: StructuredFeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isBeta, isLoading } = useIsBetaCompany();

  // Hide if beta-only and not beta
  if (showOnlyForBeta && !isLoading && !isBeta) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <MessageSquarePlus className="h-4 w-4 mr-1.5" />
        Donner un retour
      </Button>
      
      <StructuredFeedbackDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
