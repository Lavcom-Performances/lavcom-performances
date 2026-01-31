import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, Settings, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { useTranslation } from 'react-i18next';

interface MfaStatusData {
  isEnrolled: boolean;
  factorId: string | null;
  isLoading: boolean;
  error: string | null;
}

export function PlatformMfaStatusCard() {
  const { t } = useTranslation(['app']);
  const navigate = useNavigate();
  const { isPlatformAdmin, isPlatformSuperAdmin, isLoading: roleLoading } = usePlatformRole();
  const [mfaStatus, setMfaStatus] = useState<MfaStatusData>({
    isEnrolled: false,
    factorId: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        
        if (error) {
          setMfaStatus(prev => ({ ...prev, isLoading: false, error: error.message }));
          return;
        }
        
        const verifiedFactor = data.totp.find(f => f.status === 'verified');
        setMfaStatus({
          isEnrolled: !!verifiedFactor,
          factorId: verifiedFactor?.id || null,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setMfaStatus(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    };

    checkMfaStatus();
  }, []);

  const handleSetupMfa = () => {
    navigate('/settings/security');
  };

  if (roleLoading || mfaStatus.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <CardTitle className="text-sm font-medium">Sécurité MFA</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  // Only show for platform admins
  if (!isPlatformAdmin) {
    return null;
  }

  return (
    <Card className={!mfaStatus.isEnrolled ? 'border-destructive/50 bg-destructive/5' : ''}>
      <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mfaStatus.isEnrolled ? (
              <ShieldCheck className="h-4 w-4 text-primary" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-destructive" />
            )}
            <CardTitle className="text-sm font-medium">Sécurité MFA</CardTitle>
          </div>
          <Badge variant={mfaStatus.isEnrolled ? 'default' : 'destructive'}>
            {mfaStatus.isEnrolled ? 'Activé' : 'Requis'}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {isPlatformSuperAdmin ? 'Super Admin' : 'Admin Plateforme'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {mfaStatus.isEnrolled ? (
          <p className="text-xs text-muted-foreground">
            ✅ Votre compte est protégé par l'authentification à deux facteurs (TOTP).
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <p>
                <strong>Action requise :</strong> Les administrateurs de plateforme doivent activer 
                le MFA pour accéder aux fonctions sensibles (impersonnalisation, feature flags, DR drills, etc.)
              </p>
            </div>
            <Button 
              size="sm" 
              className="w-full gap-2"
              onClick={handleSetupMfa}
            >
              <Settings className="h-3.5 w-3.5" />
              Configurer le MFA maintenant
            </Button>
          </div>
        )}
        
        {mfaStatus.error && (
          <p className="text-xs text-destructive">Erreur: {mfaStatus.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
