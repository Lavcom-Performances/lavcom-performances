import { useState } from "react";
import { LogOut, Loader2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface SignOutAllSessionsProps {
  variant?: "default" | "destructive" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function SignOutAllSessions({ 
  variant = "outline", 
  size = "sm",
  className 
}: SignOutAllSessionsProps) {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSignOutAll = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Error signing out all sessions:', error);
        toast({
          title: t('common:error'),
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: t('app:securityCenter.sessions.signOutSuccess'),
        description: t('app:securityCenter.sessions.signOutSuccessDescription'),
      });

      // Redirect to login after signing out
      navigate('/login');
    } catch (error) {
      console.error('Error signing out all sessions:', error);
      toast({
        title: t('common:error'),
        description: t('app:securityCenter.sessions.signOutError'),
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
          ) : (
            <LogOut className="h-3 w-3 mr-1.5" />
          )}
          {t('app:securityCenter.sessions.signOutAll')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>{t('app:securityCenter.sessions.confirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('app:securityCenter.sessions.confirmDescription')}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 my-2">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t('app:securityCenter.sessions.warning')}
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t('common:cancel')}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleSignOutAll}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('app:securityCenter.sessions.signingOut')}
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                {t('app:securityCenter.sessions.confirmSignOut')}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
