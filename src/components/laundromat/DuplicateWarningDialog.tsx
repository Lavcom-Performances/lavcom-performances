/**
 * DuplicateWarningDialog.tsx
 * 
 * Modal dialog shown when potential duplicate sites are detected during creation.
 * Allows user to go back and edit or proceed anyway (soft prevention).
 * TAEX-236
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ExternalLink, Building2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logDuplicateEvent } from "@/lib/duplicateLogger";

export interface DuplicateSite {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  owner_id: string;
}

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateSite[];
  onGoBack: () => void;
  onCreateAnyway: () => void;
  formData: {
    postalCode: string;
    city: string;
    country: string;
  };
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  duplicates,
  onGoBack,
  onCreateAnyway,
  formData,
}: DuplicateWarningDialogProps) {
  const { t } = useTranslation(["app"]);
  const [confirmStep, setConfirmStep] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleGoBack = () => {
    setConfirmStep(false);
    onGoBack();
    onOpenChange(false);
  };

  const handleCreateAnywayClick = () => {
    if (!confirmStep) {
      // First click: show confirmation
      setConfirmStep(true);
    } else {
      // Second click: proceed with creation
      setIsCreating(true);
      
      // Log the override event
      logDuplicateEvent('DUPLICATE_OVERRIDE', {
        postal_code: formData.postalCode,
        city: formData.city,
        country: formData.country,
        match_count: duplicates.length,
        matched_site_ids: duplicates.map(d => d.id),
      });
      
      onCreateAnyway();
      onOpenChange(false);
      setConfirmStep(false);
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmStep(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <AlertDialogTitle>
                {t("app:duplicateWarning.title", "Possible duplicate site")}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {t(
                  "app:duplicateWarning.description",
                  "We found similar sites. Do you want to continue anyway?"
                )}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* List of potential duplicates */}
        <ScrollArea className="max-h-[250px] pr-4">
          <div className="space-y-2">
            {duplicates.map((site) => (
              <div
                key={site.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{site.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {site.city}{site.postal_code && `, ${site.postal_code}`}
                  </p>
                  {site.address && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {site.address}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Confirmation step message */}
        {confirmStep && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/50">
            <p className="text-sm text-warning-foreground">
              {t(
                "app:duplicateWarning.confirmMessage",
                "Are you sure? This may create a duplicate entry."
              )}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleGoBack}>
            {t("app:duplicateWarning.goBack", "Go back")}
          </AlertDialogCancel>
          <Button
            variant={confirmStep ? "destructive" : "secondary"}
            onClick={handleCreateAnywayClick}
            disabled={isCreating}
          >
            {confirmStep
              ? t("app:duplicateWarning.confirmCreate", "Yes, create anyway")
              : t("app:duplicateWarning.createAnyway", "Create anyway")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
