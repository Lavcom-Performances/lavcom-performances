import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  organization_id: string;
  // NOTE: 'admin' is DEPRECATED - use 'company_admin' for new code
  role: 'super_admin' | 'company_admin' | 'admin' | 'checker' | 'user' | 'guest';
  created_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole['role'];
  is_active: boolean;
  created_at: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: UserRole['role'];
  expires_at: string;
  created_at: string;
  invited_by: string;
}

export function useOrganization() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrganizationData();
    } else {
      setOrganization(null);
      setUserRole(null);
      setTeamMembers([]);
      setInvitations([]);
      setIsLoading(false);
    }
  }, [user]);

  const fetchOrganizationData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get user's role and organization
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
        setIsLoading(false);
        return;
      }

      if (!roleData) {
        // User has no organization yet - they might need to create one
        setIsLoading(false);
        return;
      }

      setUserRole(roleData as UserRole);

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', roleData.organization_id)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
      } else {
        setOrganization(orgData as Organization);
      }

      // Get team members (users with roles in this organization)
      const { data: membersData, error: membersError } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq('organization_id', roleData.organization_id);

      if (membersError) {
        console.error('Error fetching team members:', membersError);
      } else if (membersData) {
        // Fetch profile data for each member
        const memberIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', memberIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const members: TeamMember[] = membersData.map(m => {
          const profile = profilesMap.get(m.user_id);
          return {
            id: m.id,
            user_id: m.user_id,
            email: profile?.email || '',
            first_name: profile?.first_name,
            last_name: profile?.last_name,
            role: m.role as UserRole['role'],
            is_active: true,
            created_at: m.created_at
          };
        });

        setTeamMembers(members);
      }

      // Get pending invitations
      const { data: invitesData, error: invitesError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('organization_id', roleData.organization_id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      if (invitesError) {
        console.error('Error fetching invitations:', invitesError);
      } else {
        setInvitations((invitesData || []) as TeamInvitation[]);
      }

    } catch (error) {
      console.error('Error in fetchOrganizationData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createOrganization = async (name: string) => {
    if (!user) return { error: 'Non authentifié' };

    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name, owner_id: user.id })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create super_admin role for the owner
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          organization_id: org.id,
          role: 'super_admin'
        });

      if (roleError) throw roleError;

      // Refresh data
      await fetchOrganizationData();
      return { success: true, organization: org };
    } catch (error: any) {
      console.error('Error creating organization:', error);
      return { error: error.message || 'Erreur lors de la création' };
    }
  };

  const sendInvitation = async (email: string, role: UserRole['role']) => {
    if (!organization) return { error: 'Aucune organisation' };

    try {
      const { data, error } = await supabase.functions.invoke('send-team-invitation', {
        body: { email, role, organizationId: organization.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Refresh invitations
      await fetchOrganizationData();
      return { success: true, invitation: data.invitation };
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      return { error: error.message || 'Erreur lors de l\'envoi' };
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      // Refresh invitations
      await fetchOrganizationData();
      return { success: true };
    } catch (error: any) {
      console.error('Error canceling invitation:', error);
      return { error: error.message || 'Erreur lors de l\'annulation' };
    }
  };

  const updateMemberRole = async (memberId: string, newRole: UserRole['role']) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      await fetchOrganizationData();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating role:', error);
      return { error: error.message || 'Erreur lors de la mise à jour' };
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      await fetchOrganizationData();
      return { success: true };
    } catch (error: any) {
      console.error('Error removing member:', error);
      return { error: error.message || 'Erreur lors de la suppression' };
    }
  };

  // company_admin check includes legacy 'admin' for backwards compatibility
  const isCompanyAdmin = userRole?.role === 'super_admin' || userRole?.role === 'company_admin' || userRole?.role === 'admin';
  const isAdmin = isCompanyAdmin; // Alias for backwards compatibility
  const isSuperAdmin = userRole?.role === 'super_admin';

  return {
    organization,
    userRole,
    teamMembers,
    invitations,
    isLoading,
    isAdmin,
    isCompanyAdmin,
    isSuperAdmin,
    createOrganization,
    sendInvitation,
    cancelInvitation,
    updateMemberRole,
    removeMember,
    refresh: fetchOrganizationData
  };
}
