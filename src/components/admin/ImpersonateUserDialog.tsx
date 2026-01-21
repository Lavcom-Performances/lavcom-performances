import { useState } from 'react';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ImpersonateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetEmail: string;
  targetName?: string;
}

export function ImpersonateUserDialog({
  open,
  onOpenChange,
  targetUserId,
  targetEmail,
  targetName,
}: ImpersonateUserDialogProps) {
  const { startImpersonation, loading } = useImpersonation();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  const isValid = reason.trim().length >= 10 && confirmEmail === targetEmail;

  const handleStart = async () => {
    if (!isValid) return;

    const result = await startImpersonation(targetUserId, reason.trim(), ticketId.trim() || undefined);
    
    if (result.success) {
      toast.success(`Mode support activé pour ${targetEmail}`);
      onOpenChange(false);
      setReason('');
      setTicketId('');
      setConfirmEmail('');
      // Navigate to dashboard to see what the user sees
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Erreur lors du démarrage du mode support');
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      setReason('');
      setTicketId('');
      setConfirmEmail('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Mode Support (Impersonation)
          </DialogTitle>
          <DialogDescription>
            Vous allez agir en tant que cet utilisateur. Toutes les actions seront auditées.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">Utilisateur cible</p>
            <p className="text-sm text-muted-foreground">{targetEmail}</p>
            {targetName && (
              <p className="text-xs text-muted-foreground">{targetName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Raison de l'impersonation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Décrivez la raison (min. 10 caractères)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/10 caractères minimum
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketId">
              ID Ticket (optionnel)
            </Label>
            <Input
              id="ticketId"
              placeholder="Ex: SUPPORT-1234"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmEmail">
              Confirmez l'email de l'utilisateur <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirmEmail"
              placeholder={targetEmail}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className={confirmEmail && confirmEmail !== targetEmail ? 'border-destructive' : ''}
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">⚠️ Attention</p>
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li>Session limitée à 30 minutes</li>
              <li>Accès aux routes /admin bloqué</li>
              <li>Toutes les actions sont tracées</li>
              <li>L'utilisateur peut être notifié</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleStart}
            disabled={!isValid || loading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Eye className="h-4 w-4 mr-1.5" />
            {loading ? 'Démarrage...' : 'Démarrer le mode support'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
