import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, UserPlus, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// NOTE: 'admin' is DEPRECATED - use 'company_admin' for new invitations
type AppRole = 'super_admin' | 'company_admin' | 'admin' | 'checker' | 'user' | 'guest';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (email: string, role: AppRole) => Promise<{ success?: boolean; error?: string }>;
  isSuperAdmin: boolean;
}

const ROLE_OPTIONS: { value: AppRole; label: string; description: string }[] = [
  { value: 'company_admin', label: 'Administrateur', description: 'Gestion complète des utilisateurs et paramètres' },
  { value: 'checker', label: 'Contrôleur', description: 'Consultation et vérification des données' },
  { value: 'user', label: 'Utilisateur', description: 'Accès en lecture aux laveries assignées' },
  { value: 'guest', label: 'Invité', description: 'Accès limité en lecture seule' },
];

export function InviteUserDialog({ open, onOpenChange, onInvite, isSuperAdmin }: InviteUserDialogProps) {
  const { t } = useTranslation(['app']);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Adresse email invalide");
      return;
    }

    setIsLoading(true);
    try {
      const result = await onInvite(email.trim().toLowerCase(), role);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Invitation envoyée à ${email}`);
        setEmail("");
        setRole("user");
        onOpenChange(false);
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi de l'invitation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Inviter un utilisateur
          </DialogTitle>
          <DialogDescription>
            Envoyez une invitation par email pour ajouter un nouveau membre à votre équipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Adresse email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="collaborateur@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)} disabled={isLoading}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p>L'utilisateur recevra un email avec un lien d'invitation valable 7 jours.</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Envoyer l'invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
