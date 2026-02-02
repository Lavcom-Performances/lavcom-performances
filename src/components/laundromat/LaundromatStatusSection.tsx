import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Power, 
  PowerOff, 
  AlertTriangle,
  CheckCircle,
  Lock,
  Info 
} from 'lucide-react';
import { useLaundromatStatus } from '@/hooks/useLaundromatStatus';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LaundromatStatusSectionProps {
  siteId: string;
  siteName: string;
  status: 'active' | 'closed';
  closedAt?: string | null;
  onStatusChange?: () => void;
}

export function LaundromatStatusSection({
  siteId,
  siteName,
  status,
  closedAt,
  onStatusChange,
}: LaundromatStatusSectionProps) {
  const { isCompanyAdmin } = useCurrentUserPermissions();
  const { closeLaundromat, reactivateLaundromat, isClosing, isReactivating } = useLaundromatStatus({
    onSuccess: onStatusChange,
  });

  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [closeReason, setCloseReason] = useState('');

  const handleClose = async () => {
    const success = await closeLaundromat(siteId, closeReason || undefined);
    if (success) {
      setShowCloseDialog(false);
      setCloseReason('');
    }
  };

  const handleReactivate = async () => {
    const success = await reactivateLaundromat(siteId);
    if (success) {
      setShowReactivateDialog(false);
    }
  };

  const isClosed = status === 'closed';
  const canManageStatus = isCompanyAdmin;

  return (
    <>
      <Card className={isClosed ? 'border-amber-300 bg-amber-50/30' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isClosed ? (
              <PowerOff className="h-5 w-5 text-amber-600" />
            ) : (
              <Power className="h-5 w-5 text-green-600" />
            )}
            Statut de la laverie
          </CardTitle>
          <CardDescription>
            Gérer l'état opérationnel de la laverie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {isClosed ? (
              <>
                <div className="p-2 rounded-full bg-amber-100">
                  <PowerOff className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-800">Laverie fermée</p>
                  {closedAt && (
                    <p className="text-sm text-amber-700">
                      Fermée le {new Date(closedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="p-2 rounded-full bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-800">Laverie active</p>
                  <p className="text-sm text-green-700">
                    Les opérations sont en cours normalement
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Info about status effects */}
          <Alert className="border-blue-200 bg-blue-50/50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              {isClosed ? (
                <>
                  Les données historiques restent accessibles en lecture seule. 
                  Les importations et nouvelles opérations sont désactivées.
                </>
              ) : (
                <>
                  La facturation est calculée au niveau de l'entreprise et n'est pas 
                  affectée par le statut individuel des laveries.
                </>
              )}
            </AlertDescription>
          </Alert>

          {/* Action buttons */}
          <div className="pt-2">
            {isClosed ? (
              canManageStatus ? (
                <Button
                  variant="default"
                  onClick={() => setShowReactivateDialog(true)}
                  disabled={isReactivating}
                  className="gap-2"
                >
                  <Power className="h-4 w-4" />
                  {isReactivating ? 'Réactivation...' : 'Réactiver la laverie'}
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="default" disabled className="gap-2 opacity-50 cursor-not-allowed">
                        <Lock className="h-4 w-4" />
                        Réactiver la laverie
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Seuls les propriétaires et administrateurs peuvent réactiver une laverie</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            ) : (
              canManageStatus ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowCloseDialog(true)}
                  disabled={isClosing}
                  className="gap-2"
                >
                  <PowerOff className="h-4 w-4" />
                  {isClosing ? 'Fermeture...' : 'Fermer la laverie'}
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="destructive" disabled className="gap-2 opacity-50 cursor-not-allowed">
                        <Lock className="h-4 w-4" />
                        Fermer la laverie
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Seuls les propriétaires et administrateurs peuvent fermer une laverie</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Close Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Fermer cette laverie ?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>Cette action va :</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Arrêter toutes les opérations pour cette laverie</li>
                <li>Masquer la laverie des tableaux de bord actifs</li>
                <li>Conserver les données historiques en lecture seule</li>
              </ul>
              <p className="text-sm font-medium mt-2">
                La facturation n'est pas affectée (calcul au niveau entreprise).
              </p>
              <p className="text-sm text-green-700 mt-2">
                ✓ Cette action peut être annulée en réactivant la laverie.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="close-reason">Raison de la fermeture (optionnel)</Label>
            <Textarea
              id="close-reason"
              placeholder="Ex: Travaux de rénovation, fin de bail..."
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCloseDialog(false)}
              disabled={isClosing}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={isClosing}
              className="gap-2"
            >
              <PowerOff className="h-4 w-4" />
              {isClosing ? 'Fermeture...' : 'Fermer la laverie'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="h-5 w-5 text-green-500" />
              Réactiver cette laverie ?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>Cette action va :</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Reprendre les opérations à partir d'aujourd'hui</li>
                <li>Afficher la laverie dans les tableaux de bord actifs</li>
                <li>Permettre les nouvelles importations et opérations</li>
              </ul>
              <p className="text-sm font-medium mt-2">
                La facturation n'est pas affectée (calcul au niveau entreprise).
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowReactivateDialog(false)}
              disabled={isReactivating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleReactivate}
              disabled={isReactivating}
              className="gap-2"
            >
              <Power className="h-4 w-4" />
              {isReactivating ? 'Réactivation...' : 'Réactiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
