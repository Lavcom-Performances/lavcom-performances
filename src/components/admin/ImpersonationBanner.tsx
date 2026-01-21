import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut, Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function ImpersonationBanner() {
  const { isImpersonating, session, endImpersonation, loading } = useImpersonation();
  const navigate = useNavigate();

  if (!isImpersonating || !session) {
    return null;
  }

  const handleExit = async () => {
    const result = await endImpersonation('User exited support mode');
    if (result.success) {
      toast.success('Mode support terminé');
      navigate('/admin/users');
    } else {
      toast.error(result.error || 'Erreur lors de la sortie du mode support');
    }
  };

  const expiresAt = new Date(session.expires_at);
  const timeRemaining = formatDistanceToNow(expiresAt, { locale: fr, addSuffix: false });

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 shadow-lg">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="font-semibold">Mode Support</span>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5" />
              <span>{session.target_email}</span>
              {session.target_company && (
                <span className="text-amber-800">({session.target_company})</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 text-sm text-amber-800">
            <Clock className="h-3.5 w-3.5" />
            <span>Expire dans {timeRemaining}</span>
          </div>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExit}
            disabled={loading}
            className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Quitter
          </Button>
        </div>
      </div>
    </div>
  );
}
