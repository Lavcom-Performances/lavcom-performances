import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BetaFeedbackDialog } from "./BetaFeedbackDialog";

interface BetaFeedbackButtonProps {
  variant?: "default" | "link" | "ghost";
  className?: string;
}

export function BetaFeedbackButton({ 
  variant = "link", 
  className 
}: BetaFeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <MessageSquarePlus className="h-4 w-4 mr-1.5" />
        Donner un retour
      </Button>
      
      <BetaFeedbackDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
