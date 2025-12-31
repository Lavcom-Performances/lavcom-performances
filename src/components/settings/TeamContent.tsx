import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Mail, Trash2, Loader2, Crown, Shield } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { InviteUserDialog } from "@/components/admin/InviteUserDialog";
import { CreateOrganizationDialog } from "@/components/admin/CreateOrganizationDialog";
import { toast } from "sonner";

export default function TeamContent() {
  const { 
    organization, 
    teamMembers, 
    invitations, 
    isLoading, 
    isAdmin,
    sendInvitation,
    cancelInvitation,
    removeMember,
    createOrganization
  } = useOrganization();
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);

  const handleSendInvitation = async (email: string, role: 'super_admin' | 'admin' | 'checker' | 'user' | 'guest') => {
    try {
      await sendInvitation(email, role);
      toast.success("Invitation envoyée");
      setInviteDialogOpen(false);
      return { success: true };
    } catch (error) {
      toast.error("Erreur lors de l'envoi de l'invitation");
      return { error: "Erreur" };
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
      toast.success("Invitation annulée");
    } catch (error) {
      toast.error("Erreur lors de l'annulation");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      toast.success("Membre retiré de l'équipe");
    } catch (error) {
      toast.error("Erreur lors du retrait");
    }
  };

  const handleCreateOrganization = async (name: string) => {
    try {
      await createOrganization(name);
      toast.success("Organisation créée");
      setCreateOrgDialogOpen(false);
      return { success: true };
    } catch (error) {
      toast.error("Erreur lors de la création");
      return { error: "Erreur" };
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30"><Crown className="h-3 w-3 mr-1" />Super Admin</Badge>;
      case 'admin':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'checker':
        return <Badge variant="secondary">Vérificateur</Badge>;
      case 'user':
        return <Badge variant="outline">Utilisateur</Badge>;
      case 'guest':
        return <Badge variant="outline" className="text-muted-foreground">Invité</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Gestion d'équipe
            </CardTitle>
            <CardDescription>
              Créez une organisation pour inviter des membres dans votre équipe
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Pas d'organisation</h3>
            <p className="text-muted-foreground mb-4">
              Créez une organisation pour collaborer avec votre équipe
            </p>
            <Button onClick={() => setCreateOrgDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Créer une organisation
            </Button>
          </CardContent>
        </Card>

        <CreateOrganizationDialog
          open={createOrgDialogOpen}
          onOpenChange={setCreateOrgDialogOpen}
          onCreate={handleCreateOrganization}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Équipe - {organization.name}
              </CardTitle>
              <CardDescription>
                {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''} dans votre organisation
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Inviter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-medium text-primary">
                    {member.email?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{member.email}</p>
                  {getRoleBadge(member.role)}
                </div>
              </div>
              {isAdmin && member.role !== 'super_admin' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemoveMember(member.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Invitations en attente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(invitation.role)}
                      <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                        En attente
                      </Badge>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleSendInvitation}
        isSuperAdmin={false}
      />
    </div>
  );
}
