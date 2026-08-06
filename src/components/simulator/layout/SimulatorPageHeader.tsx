import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
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
} from "@/components/ui/alert-dialog";
import { SimulatorFooterNav } from "./SimulatorFooterNav";
import { useSimulatorProjectContext } from "@/contexts/SimulatorProjectContext";
import { useTranslation } from "react-i18next";

interface Props {
  title: string;
  description: string;
  isFinalStep?: boolean;
}

export function SimulatorPageHeader({
  title,
  description,
  isFinalStep,
}: Props) {
  const { t } = useTranslation("paid-simulator");
  const { resetProject } = useSimulatorProjectContext();
  const [open, setOpen] = useState(false);

  function onReset() {
    resetProject();
    setOpen(false);
    toast.success(t("common.resetDialog.success"));
  }

  const resetButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setOpen(true)}
      className="gap-2 text-muted-foreground hover:text-orange-600"
    >
      <RotateCcw className="h-4 w-4" />
      {t("common.reset")}
    </Button>
  );

  const resetDialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.resetDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("common.resetDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.resetDialog.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onReset}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("common.resetDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (isFinalStep
    ? (<div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 w-full">
        <SimulatorFooterNav
          previousPath="/simulator/charges"
          previousLabel={t("common.backToPreviousStep")}
          isFinalStep={isFinalStep}
        />
        {resetButton}
      </div>
      <div className="flex flex-col items-center w-full mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-base text-muted-foreground">{description}</p>
      </div>
      {resetDialog}
    </div>)
    : (<div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-base text-muted-foreground">{description}</p>
      </div>
      {resetButton}
      {resetDialog}
    </div>)
  );
}
