import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DangerZoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmText: string;
  onConfirm: () => void;
  isLoading?: boolean;
  actionLabel?: string;
  cancelLabel?: string;
}

export function DangerZoneDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  onConfirm,
  isLoading = false,
  actionLabel = "Supprimer",
  cancelLabel = "Annuler",
}: DangerZoneDialogProps) {
  const [inputValue, setInputValue] = React.useState("");
  const isConfirmed = inputValue === confirmText;

  // Reset input when dialog closes
  React.useEffect(() => {
    if (!open) {
      setInputValue("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-destructive/50">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-destructive">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Zone dangereuse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cette action est irréversible. Toutes les données associées seront
              définitivement supprimées.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-input" className="text-sm">
              Pour confirmer, tapez{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm font-semibold">
                {confirmText}
              </code>
            </Label>
            <Input
              id="confirm-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmText}
              className={cn(
                "font-mono",
                isConfirmed && "border-green-500 focus-visible:ring-green-500"
              )}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {inputValue && !isConfirmed && (
              <p className="text-xs text-destructive">
                Le texte ne correspond pas exactement
              </p>
            )}
            {isConfirmed && (
              <p className="text-xs text-green-600">
                ✓ Confirmation validée
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
            className={cn(
              "bg-destructive hover:bg-destructive/90",
              (!isConfirmed || isLoading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? "Suppression..." : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
