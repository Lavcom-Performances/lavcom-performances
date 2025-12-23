import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, 
  Check, 
  X, 
  Eye, 
  Pencil, 
  Trash2, 
  Download,
  Loader2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TeamMember } from "@/hooks/useOrganization";

interface Site {
  id: string;
  name: string;
  city?: string;
  organization_id?: string;
}

interface SiteAccess {
  id: string;
  user_id: string;
  site_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
}

interface SiteAccessManagerProps {
  organizationId: string;
  teamMembers: TeamMember[];
  isAdmin: boolean;
}

export function SiteAccessManager({ organizationId, teamMembers, isAdmin }: SiteAccessManagerProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [siteAccess, setSiteAccess] = useState<SiteAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [updatingAccess, setUpdatingAccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch sites for this organization
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('id, name, city, organization_id')
        .eq('organization_id', organizationId)
        .eq('is_demo', false)
        .order('name');

      if (sitesError) throw sitesError;
      setSites(sitesData || []);

      // Fetch all site access for team members
      if (sitesData && sitesData.length > 0) {
        const siteIds = sitesData.map(s => s.id);
        const memberIds = teamMembers.map(m => m.user_id);

        const { data: accessData, error: accessError } = await supabase
          .from('site_access')
          .select('*')
          .in('site_id', siteIds)
          .in('user_id', memberIds);

        if (accessError) throw accessError;
        setSiteAccess(accessData || []);
      }
    } catch (error) {
      console.error('Error fetching site access data:', error);
      toast.error('Erreur lors du chargement des accès');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSiteExpanded = (siteId: string) => {
    setExpandedSites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(siteId)) {
        newSet.delete(siteId);
      } else {
        newSet.add(siteId);
      }
      return newSet;
    });
  };

  const getAccessForMember = (siteId: string, userId: string): SiteAccess | undefined => {
    return siteAccess.find(a => a.site_id === siteId && a.user_id === userId);
  };

  const updateAccess = async (
    siteId: string,
    userId: string,
    field: 'can_view' | 'can_edit' | 'can_delete' | 'can_export',
    value: boolean
  ) => {
    if (!isAdmin) return;
    
    const accessKey = `${siteId}-${userId}-${field}`;
    setUpdatingAccess(accessKey);

    try {
      const existingAccess = getAccessForMember(siteId, userId);

      if (existingAccess) {
        // Update existing access
        const { error } = await supabase
          .from('site_access')
          .update({ [field]: value })
          .eq('id', existingAccess.id);

        if (error) throw error;

        setSiteAccess(prev => prev.map(a => 
          a.id === existingAccess.id ? { ...a, [field]: value } : a
        ));
      } else {
        // Create new access record
        const newAccess: Omit<SiteAccess, 'id'> = {
          user_id: userId,
          site_id: siteId,
          can_view: field === 'can_view' ? value : true,
          can_edit: field === 'can_edit' ? value : false,
          can_delete: field === 'can_delete' ? value : false,
          can_export: field === 'can_export' ? value : true
        };

        const { data, error } = await supabase
          .from('site_access')
          .insert(newAccess)
          .select()
          .single();

        if (error) throw error;
        setSiteAccess(prev => [...prev, data]);
      }

      toast.success('Accès mis à jour');
    } catch (error) {
      console.error('Error updating access:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingAccess(null);
    }
  };

  const grantFullAccess = async (siteId: string, userId: string) => {
    if (!isAdmin) return;

    const accessKey = `${siteId}-${userId}-full`;
    setUpdatingAccess(accessKey);

    try {
      const existingAccess = getAccessForMember(siteId, userId);

      const fullAccess = {
        can_view: true,
        can_edit: true,
        can_delete: true,
        can_export: true
      };

      if (existingAccess) {
        const { error } = await supabase
          .from('site_access')
          .update(fullAccess)
          .eq('id', existingAccess.id);

        if (error) throw error;

        setSiteAccess(prev => prev.map(a => 
          a.id === existingAccess.id ? { ...a, ...fullAccess } : a
        ));
      } else {
        const { data, error } = await supabase
          .from('site_access')
          .insert({
            user_id: userId,
            site_id: siteId,
            ...fullAccess
          })
          .select()
          .single();

        if (error) throw error;
        setSiteAccess(prev => [...prev, data]);
      }

      toast.success('Accès complet accordé');
    } catch (error) {
      console.error('Error granting full access:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingAccess(null);
    }
  };

  const revokeAllAccess = async (siteId: string, userId: string) => {
    if (!isAdmin) return;

    const accessKey = `${siteId}-${userId}-revoke`;
    setUpdatingAccess(accessKey);

    try {
      const existingAccess = getAccessForMember(siteId, userId);

      if (existingAccess) {
        const { error } = await supabase
          .from('site_access')
          .delete()
          .eq('id', existingAccess.id);

        if (error) throw error;

        setSiteAccess(prev => prev.filter(a => a.id !== existingAccess.id));
        toast.success('Accès révoqué');
      }
    } catch (error) {
      console.error('Error revoking access:', error);
      toast.error('Erreur lors de la révocation');
    } finally {
      setUpdatingAccess(null);
    }
  };

  const getMemberName = (member: TeamMember) => {
    if (member.first_name && member.last_name) {
      return `${member.first_name} ${member.last_name}`;
    }
    return member.email.split('@')[0];
  };

  const getAccessSummary = (siteId: string) => {
    const count = siteAccess.filter(a => a.site_id === siteId && a.can_view).length;
    return count;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="text-center py-12 card-lavcom">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Aucune laverie</h3>
        <p className="text-muted-foreground text-sm">
          Aucune laverie n'est associée à cette organisation.
          <br />
          Créez d'abord des laveries pour gérer les accès.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card-lavcom p-4">
        <p className="text-sm text-muted-foreground">
          Gérez les permissions d'accès de chaque membre à vos laveries.
          <span className="font-medium text-foreground"> Les super admins et admins ont accès à toutes les laveries par défaut.</span>
        </p>
      </div>

      <div className="space-y-3">
        {sites.map(site => (
          <Collapsible 
            key={site.id} 
            open={expandedSites.has(site.id)}
            onOpenChange={() => toggleSiteExpanded(site.id)}
          >
            <div className="card-lavcom overflow-hidden">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto rounded-none hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{site.name}</p>
                      {site.city && (
                        <p className="text-sm text-muted-foreground">{site.city}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {getAccessSummary(site.id)} accès
                    </Badge>
                    {expandedSites.has(site.id) ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="min-w-[150px]">Membre</TableHead>
                          <TableHead className="text-center w-[80px]">
                            <div className="flex flex-col items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span className="text-xs">Voir</span>
                            </div>
                          </TableHead>
                          <TableHead className="text-center w-[80px]">
                            <div className="flex flex-col items-center gap-1">
                              <Pencil className="h-4 w-4" />
                              <span className="text-xs">Éditer</span>
                            </div>
                          </TableHead>
                          <TableHead className="text-center w-[80px]">
                            <div className="flex flex-col items-center gap-1">
                              <Trash2 className="h-4 w-4" />
                              <span className="text-xs">Suppr.</span>
                            </div>
                          </TableHead>
                          <TableHead className="text-center w-[80px]">
                            <div className="flex flex-col items-center gap-1">
                              <Download className="h-4 w-4" />
                              <span className="text-xs">Export</span>
                            </div>
                          </TableHead>
                          {isAdmin && (
                            <TableHead className="text-right w-[120px]">Actions</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map(member => {
                          const access = getAccessForMember(site.id, member.user_id);
                          const isAdminMember = member.role === 'super_admin' || member.role === 'admin';
                          const isUpdating = updatingAccess?.startsWith(`${site.id}-${member.user_id}`);

                          return (
                            <TableRow key={member.id} className="hover:bg-muted/20">
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{getMemberName(member)}</p>
                                  <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {isAdminMember ? (
                                  <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <Switch
                                    checked={access?.can_view ?? false}
                                    onCheckedChange={(v) => updateAccess(site.id, member.user_id, 'can_view', v)}
                                    disabled={!isAdmin || isUpdating}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {isAdminMember ? (
                                  <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <Switch
                                    checked={access?.can_edit ?? false}
                                    onCheckedChange={(v) => updateAccess(site.id, member.user_id, 'can_edit', v)}
                                    disabled={!isAdmin || isUpdating}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {isAdminMember ? (
                                  <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <Switch
                                    checked={access?.can_delete ?? false}
                                    onCheckedChange={(v) => updateAccess(site.id, member.user_id, 'can_delete', v)}
                                    disabled={!isAdmin || isUpdating}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {isAdminMember ? (
                                  <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <Switch
                                    checked={access?.can_export ?? false}
                                    onCheckedChange={(v) => updateAccess(site.id, member.user_id, 'can_export', v)}
                                    disabled={!isAdmin || isUpdating}
                                  />
                                )}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  {!isAdminMember && (
                                    <div className="flex gap-1 justify-end">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs h-7"
                                        onClick={() => grantFullAccess(site.id, member.user_id)}
                                        disabled={isUpdating}
                                      >
                                        {isUpdating ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          'Tout'
                                        )}
                                      </Button>
                                      {access && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-xs h-7 text-destructive hover:text-destructive"
                                          onClick={() => revokeAllAccess(site.id, member.user_id)}
                                          disabled={isUpdating}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
