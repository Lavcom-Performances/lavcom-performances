import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { SEOHead } from '@/components/seo/SEOHead';
import { 
  Sparkles, 
  Store, 
  Calendar,
  Clock,
  AlertCircle,
  UserPlus,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface BetaCompany {
  id: string;
  name: string;
  is_beta: boolean;
  beta_started_at: string;
  beta_ends_at: string;
  beta_price_cents: number;
  standard_price_cents: number;
  effective_price_cents: number;
  days_remaining: number;
  active_laundromats: number;
}

interface BetaCompaniesResponse {
  total: number;
  companies: BetaCompany[] | null;
}

export default function PlatformBetaCompanies() {
  const queryClient = useQueryClient();
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [endBetaDialogOpen, setEndBetaDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyIdToEnroll, setCompanyIdToEnroll] = useState('');
  const [endBetaReason, setEndBetaReason] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['platform-beta-companies'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_platform_admin_beta_companies', {
        p_limit: 100,
        p_offset: 0,
      });
      if (error) throw error;
      return data as unknown as BetaCompaniesResponse;
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase.functions.invoke('enroll-company-in-beta', {
        body: { company_id: companyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Entreprise inscrite au programme bêta');
      queryClient.invalidateQueries({ queryKey: ['platform-beta-companies'] });
      setEnrollDialogOpen(false);
      setCompanyIdToEnroll('');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const endBetaMutation = useMutation({
    mutationFn: async ({ companyId, reason }: { companyId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('end-beta-early', {
        body: { company_id: companyId, reason },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Programme bêta terminé pour cette entreprise');
      queryClient.invalidateQueries({ queryKey: ['platform-beta-companies'] });
      setEndBetaDialogOpen(false);
      setSelectedCompanyId(null);
      setEndBetaReason('');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleEnroll = () => {
    if (!companyIdToEnroll.trim()) {
      toast.error('Veuillez entrer un ID d\'entreprise');
      return;
    }
    enrollMutation.mutate(companyIdToEnroll.trim());
  };

  const handleEndBeta = () => {
    if (!selectedCompanyId) return;
    endBetaMutation.mutate({ 
      companyId: selectedCompanyId, 
      reason: endBetaReason || 'Fin anticipée par administrateur' 
    });
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'd MMMM yyyy', { locale: fr });
  };

  return (
    <>
      <SEOHead 
        title="Entreprises Bêta | Back-office Plateforme"
        description="Gestion du programme bêta"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Programme Bêta
            </h1>
            <p className="text-muted-foreground">
              Gestion des entreprises inscrites au programme bêta (9€/laverie/mois pendant 6 mois)
            </p>
          </div>
          <Button onClick={() => setEnrollDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Inscrire une entreprise
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <div className="text-2xl font-bold">{data?.total || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground">Entreprises en bêta</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Store className="h-8 w-8 text-green-500" />
                <div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {data?.companies?.reduce((sum, c) => sum + c.active_laundromats, 0) || 0}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Laveries actives</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 flex items-center justify-center text-2xl font-bold text-blue-500">
                  9€
                </div>
                <div>
                  <div className="text-lg font-semibold">Tarif bêta</div>
                  <p className="text-xs text-muted-foreground">/laverie/mois</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <div className="text-lg font-semibold">6 mois</div>
                  <p className="text-xs text-muted-foreground">Durée du programme</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Companies List */}
        <Card>
          <CardHeader>
            <CardTitle>Entreprises inscrites</CardTitle>
            <CardDescription>
              Liste des entreprises bénéficiant du tarif bêta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-60" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <p>Erreur lors du chargement des données</p>
              </div>
            ) : !data?.companies?.length ? (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">Aucune entreprise en bêta</h3>
                <p className="text-muted-foreground mb-4">
                  Cliquez sur "Inscrire une entreprise" pour ajouter une première entreprise au programme
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.companies.map((company) => (
                  <div
                    key={company.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{company.name}</span>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          Bêta
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Store className="h-4 w-4" />
                          {company.active_laundromats} laverie{company.active_laundromats > 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Fin: {formatDate(company.beta_ends_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {company.days_remaining} jours restants
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {(company.effective_price_cents / 100).toFixed(0)}€
                        </div>
                        <p className="text-xs text-muted-foreground">/laverie/mois</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCompanyId(company.id);
                          setEndBetaDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Terminer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enroll Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscrire une entreprise au programme bêta</DialogTitle>
            <DialogDescription>
              L'entreprise bénéficiera du tarif bêta (9€/laverie/mois) pendant 6 mois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="companyId">ID de l'entreprise (organization_id)</Label>
              <Input
                id="companyId"
                placeholder="uuid..."
                value={companyIdToEnroll}
                onChange={(e) => setCompanyIdToEnroll(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleEnroll} 
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? 'Inscription...' : 'Inscrire'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Beta Dialog */}
      <Dialog open={endBetaDialogOpen} onOpenChange={setEndBetaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminer le programme bêta</DialogTitle>
            <DialogDescription>
              Cette action mettra fin au tarif bêta pour cette entreprise. Le tarif standard (29€/laverie/mois) s'appliquera immédiatement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Raison (optionnel)</Label>
              <Textarea
                id="reason"
                placeholder="Raison de la fin anticipée..."
                value={endBetaReason}
                onChange={(e) => setEndBetaReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndBetaDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleEndBeta} 
              disabled={endBetaMutation.isPending}
            >
              {endBetaMutation.isPending ? 'En cours...' : 'Terminer le bêta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
