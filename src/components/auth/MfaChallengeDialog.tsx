import { useState } from "react";
import { Shield, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useTranslation } from "react-i18next";

interface MfaChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (code: string) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
  onCancel: () => void;
  isVerifying: boolean;
  actionLabel?: string;
}

export function MfaChallengeDialog({
  open,
  onOpenChange,
  onVerify,
  onSuccess,
  onCancel,
  isVerifying,
  actionLabel,
}: MfaChallengeDialogProps) {
  const { t } = useTranslation(["app", "common"]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError(t("app:mfa.invalidCodeLength"));
      return;
    }

    setError("");
    const result = await onVerify(code);

    if (result.success) {
      setCode("");
      onSuccess();
    } else {
      setError(result.error || t("app:mfa.invalidCode"));
    }
  };

  const handleClose = () => {
    setCode("");
    setError("");
    onCancel();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t("app:mfaChallenge.title")}
          </DialogTitle>
          <DialogDescription>
            {actionLabel
              ? t("app:mfaChallenge.descriptionWithAction", { action: actionLabel })
              : t("app:mfaChallenge.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => {
                setCode(value);
                setError("");
              }}
              disabled={isVerifying}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {t("app:mfaChallenge.hint")}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isVerifying}
          >
            {t("common:cancel")}
          </Button>
          <Button
            variant="lavcom"
            onClick={handleVerify}
            disabled={isVerifying || code.length !== 6}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t("app:mfaChallenge.verifying")}
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                {t("app:mfaChallenge.verify")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
