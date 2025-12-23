import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Users, Mail, Building2 } from "lucide-react";
import { toast } from "sonner";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  organization_name?: string;
  expires_at: string;
  accepted_at: string | null;
}

type InvitationStatus = 'loading' | 'valid' | 'expired' | 'already_accepted' | 'not_found' | 'error';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<InvitationStatus>('loading');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  
  // For signup flow
  const [showSignup, setShowSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  useEffect(() => {
    if (token) {
      validateInvitation(token);
    } else {
      setStatus('not_found');
    }
  }, [token]);

  const validateInvitation = async (inviteToken: string) => {
    try {
      // Query invitation by token - we need to use service role or make token column accessible
      const { data, error } = await supabase
        .from('team_invitations')
        .select('id, email, role, organization_id, expires_at, accepted_at')
        .eq('token', inviteToken)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setStatus('not_found');
        return;
      }

      if (data.accepted_at) {
        setStatus('already_accepted');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setStatus('expired');
        return;
      }

      // Get organization name
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', data.organization_id)
        .single();

      setInvitation({
        ...data,
        organization_name: orgData?.name || 'Organisation'
      });
      setEmail(data.email);
      setStatus('valid');
    } catch (error) {
      console.error('Error validating invitation:', error);
      setStatus('error');
    }
  };

  const acceptInvitation = async () => {
    if (!invitation || !user) return;

    // Check if the user email matches the invitation email
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      toast.error(`Cette invitation est pour ${invitation.email}. Connectez-vous avec ce compte.`);
      return;
    }

    setIsAccepting(true);
    try {
      // Create user role in the organization
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          organization_id: invitation.organization_id,
          role: invitation.role as 'super_admin' | 'admin' | 'checker' | 'user' | 'guest'
        });

      if (roleError) {
        if (roleError.code === '23505') {
          toast.error('Vous êtes déjà membre de cette organisation');
        } else {
          throw roleError;
        }
        return;
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      toast.success('Invitation acceptée ! Bienvenue dans l\'équipe.');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Erreur lors de l\'acceptation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    setIsSigningUp(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/invitation?token=${token}`,
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        toast.success('Compte créé ! Vérifiez votre email pour confirmer.');
      }
    } catch (error: any) {
      console.error('Error signing up:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Un compte existe déjà avec cet email. Connectez-vous.');
        setShowSignup(false);
      } else {
        toast.error(error.message || 'Erreur lors de l\'inscription');
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      checker: 'Contrôleur',
      user: 'Utilisateur',
      guest: 'Invité'
    };
    return labels[role] || role;
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Vérification de l'invitation...</p>
        </div>
      </div>
    );
  }

  // Error states
  if (status === 'not_found' || status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Invitation non trouvée</CardTitle>
            <CardDescription>
              Cette invitation n'existe pas ou le lien est invalide.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle>Invitation expirée</CardTitle>
            <CardDescription>
              Cette invitation a expiré. Demandez à l'administrateur de vous envoyer une nouvelle invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'already_accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <CardTitle>Invitation déjà acceptée</CardTitle>
            <CardDescription>
              Cette invitation a déjà été acceptée. Connectez-vous pour accéder à votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <Button asChild className="w-full">
              <Link to="/login">Se connecter</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invitation
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Link to="/" className="inline-block mb-4">
            <img src={lavcomLogo} alt="Lavcom" className="h-10 mx-auto" />
          </Link>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Invitation à rejoindre une équipe</CardTitle>
          <CardDescription>
            Vous avez été invité à rejoindre une organisation
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Organisation</p>
                <p className="font-medium">{invitation?.organization_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{invitation?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Rôle</p>
                <p className="font-medium">{getRoleLabel(invitation?.role || '')}</p>
              </div>
            </div>
          </div>

          {/* Action based on auth state */}
          {user ? (
            // User is logged in
            <div className="space-y-4">
              {user.email?.toLowerCase() === invitation?.email.toLowerCase() ? (
                <Button 
                  className="w-full" 
                  onClick={acceptInvitation}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Acceptation...
                    </>
                  ) : (
                    'Accepter l\'invitation'
                  )}
                </Button>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-sm text-amber-600">
                    Vous êtes connecté avec <strong>{user.email}</strong>.
                    <br />
                    Cette invitation est pour <strong>{invitation?.email}</strong>.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      toast.info('Déconnecté. Connectez-vous avec le bon compte.');
                    }}
                  >
                    Se déconnecter
                  </Button>
                </div>
              )}
            </div>
          ) : showSignup ? (
            // Signup form
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSigningUp}>
                {isSigningUp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer mon compte'
                )}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full"
                onClick={() => setShowSignup(false)}
              >
                J'ai déjà un compte
              </Button>
            </form>
          ) : (
            // Login/Signup choice
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to={`/login?redirect=/invitation?token=${token}`}>
                  Se connecter
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowSignup(true)}
              >
                Créer un compte
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
