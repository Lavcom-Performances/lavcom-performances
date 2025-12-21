import { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

interface ReAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function ReAuthDialog({
  open,
  onOpenChange,
  onSuccess,
  title,
  description,
}: ReAuthDialogProps) {
  const { t } = useTranslation(['app', 'common']);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!password) {
      setError(t('app:reAuth.passwordRequired'));
      return;
    }
    
    if (!user?.email) {
      setError(t('app:reAuth.noEmail'));
      return;
    }
    
    setIsLoading(true);
    
    // Re-authenticate by signing in again
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    
    setIsLoading(false);
    
    if (signInError) {
      if (signInError.message.includes("Invalid login credentials")) {
        setError(t('app:reAuth.invalidPassword'));
      } else {
        setError(signInError.message);
      }
      return;
    }
    
    // Success - reset and call callback
    setPassword("");
    onOpenChange(false);
    onSuccess();
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {title || t('app:reAuth.title')}
              </DialogTitle>
              <DialogDescription>
                {description || t('app:reAuth.description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reauth-password">
              {t('app:reAuth.passwordLabel')}
            </Label>
            <div className="relative">
              <Input
                id="reauth-password"
                type={showPassword ? "text" : "password"}
                placeholder={t('app:reAuth.passwordPlaceholder')}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
                autoFocus
                autoComplete="current-password"
                className={`pr-10 ${error ? "border-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? t('app:accessibility.hidePassword') : t('app:accessibility.showPassword')}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              {t('common:cancel')}
            </Button>
            <Button
              type="submit"
              variant="lavcom"
              disabled={isLoading || !password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('app:reAuth.verifying')}
                </>
              ) : (
                t('app:reAuth.confirm')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
