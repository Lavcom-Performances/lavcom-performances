/**
 * TAEX-302: Beta Ops Dashboard
 * /admin/beta/ops
 * 
 * Week-1 monitoring dashboard with Overview, Alerts, and Actions tabs.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { 
  Activity,
  AlertTriangle,
  RefreshCw,
  MoreHorizontal,
  Calculator,
  MessageSquareOff,
  MessageSquare,
  XCircle,
  Phone,
  Clock,
  TrendingDown,
  FileWarning,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OverviewRow {
  company_id: string;
  company_name: string;
  last_activity: string | null;
  dts_avg_7d: number;
  import_flag_rate: number;
  export_failures_7d: number;
  feedback_count_7d: number;
  days_since_activity: number;
  recommendations_suppressed: boolean;
}

interface AlertRow {
  company_id: string;
  company_name: string;
  alert_type: string;
  alert_reason: string;
  severity: string;
  detected_at: string;
}

interface ActionLogRow {
  id: number;
  company_id: string;
  actor_user_id: string;
  action_type: string;
  message: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export default function BetaOpsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Dialog states
  const [suppressDialogOpen, setSuppressDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [endBetaDialogOpen, setEndBetaDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [suppressReason, setSuppressReason] = useState("");
  const [contactChannel, setContactChannel] = useState("email");
  const [contactNotes, setContactNotes] = useState("");
  const [endBetaReason, setEndBetaReason] = useState("");

  // Fetch overview data
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ["beta-ops-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_beta_ops_overview');
      if (error) throw error;
      return data as unknown as OverviewRow[];
    },
  });

  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["beta-ops-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_beta_ops_alerts');
      if (error) throw error;
      return data as unknown as AlertRow[];
    },
  });

  // Fetch actions log
  const { data: actionsLog, isLoading: actionsLoading } = useQuery({
    queryKey: ["beta-ops-actions-log"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_beta_ops_actions_log', { p_limit: 50 });
      if (error) throw error;
      return data as unknown as ActionLogRow[];
    },
  });

  // Mutations
  const recalcDtsMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase.rpc('rpc_recalc_latest_dts', { p_company_id: companyId });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`DTS recalculé pour ${(data as { sites_processed: number }).sites_processed} site(s)`);
      queryClient.invalidateQueries({ queryKey: ["beta-ops"] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const toggleSuppressionMutation = useMutation({
    mutationFn: async ({ companyId, suppressed, reason }: { companyId: string; suppressed: boolean; reason?: string }) => {
      const { data, error } = await supabase.rpc('rpc_toggle_recommendations_suppression', {
        p_company_id: companyId,
        p_suppressed: suppressed,
        p_reason: reason || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.suppressed ? "Recommandations supprimées" : "Recommandations réactivées");
      queryClient.invalidateQueries({ queryKey: ["beta-ops"] });
      setSuppressDialogOpen(false);
      setSuppressReason("");
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const logContactMutation = useMutation({
    mutationFn: async ({ companyId, channel, notes }: { companyId: string; channel: string; notes: string }) => {
      const { data, error } = await supabase.rpc('rpc_log_beta_contact', {
        p_company_id: companyId,
        p_channel: channel,
        p_notes: notes,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Contact enregistré");
      queryClient.invalidateQueries({ queryKey: ["beta-ops-actions-log"] });
      setContactDialogOpen(false);
      setContactNotes("");
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
      toast.success("Programme bêta terminé");
      queryClient.invalidateQueries({ queryKey: ["beta-ops"] });
      setEndBetaDialogOpen(false);
      setEndBetaReason("");
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "error":
        return <Badge variant="destructive">Critique</Badge>;
      case "warn":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Attention</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case "low_dts":
        return <TrendingDown className="h-4 w-4" />;
      case "high_import_flags":
        return <FileWarning className="h-4 w-4" />;
      case "export_failures":
        return <AlertCircle className="h-4 w-4" />;
      case "inactivity":
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "beta_ops_recalc_dts":
        return <Calculator className="h-4 w-4 text-blue-500" />;
      case "beta_ops_suppress_reco":
        return <MessageSquareOff className="h-4 w-4 text-amber-500" />;
      case "beta_ops_unsuppress_reco":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "beta_ops_end_beta_early":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "beta_ops_contact_logged":
        return <Phone className="h-4 w-4 text-primary" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <>
      <SEOHead 
        title="Beta Ops | Back-office"
        description="Tableau de bord opérationnel beta"
        noindex
      />

      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Beta Ops
            </h1>
            <p className="text-muted-foreground">
              Monitoring et actions opérationnelles semaine 1
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/beta/billing-check")}>
              Vérif. Facturation
            </Button>
            <Button variant="outline" size="icon" onClick={() => refetchOverview()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertes
              {alerts && alerts.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {alerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <Clock className="h-4 w-4" />
              Journal
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Entreprises Beta (7 derniers jours)</CardTitle>
                <CardDescription>
                  Activité, qualité des données et statut des recommandations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : !overview?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucune entreprise en bêta
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entreprise</TableHead>
                        <TableHead>Dernière activité</TableHead>
                        <TableHead className="text-right">DTS moy.</TableHead>
                        <TableHead className="text-right">Flags import</TableHead>
                        <TableHead className="text-right">Exports KO</TableHead>
                        <TableHead className="text-right">Feedback</TableHead>
                        <TableHead>Recos</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overview.map((row) => (
                        <TableRow key={row.company_id}>
                          <TableCell className="font-medium">{row.company_name}</TableCell>
                          <TableCell>
                            {row.last_activity ? (
                              <span className={row.days_since_activity >= 3 ? "text-amber-600" : "text-muted-foreground"}>
                                {formatDistanceToNow(new Date(row.last_activity), { addSuffix: true, locale: fr })}
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">Jamais</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant={row.dts_avg_7d < 60 ? "destructive" : row.dts_avg_7d < 80 ? "secondary" : "outline"}
                              className={row.dts_avg_7d >= 80 ? "text-green-600 border-green-300" : ""}
                            >
                              {row.dts_avg_7d || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {row.import_flag_rate > 20 ? (
                              <Badge variant="destructive">{row.import_flag_rate}%</Badge>
                            ) : (
                              <span className="text-muted-foreground">{row.import_flag_rate}%</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.export_failures_7d > 0 ? (
                              <Badge variant={row.export_failures_7d >= 3 ? "destructive" : "secondary"}>
                                {row.export_failures_7d}
                              </Badge>
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.feedback_count_7d > 0 ? (
                              <Badge variant="outline">{row.feedback_count_7d}</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {row.recommendations_suppressed ? (
                              <Badge variant="secondary" className="gap-1">
                                <MessageSquareOff className="h-3 w-3" />
                                Off
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
                                <MessageSquare className="h-3 w-3" />
                                On
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => recalcDtsMutation.mutate(row.company_id)}
                                  disabled={recalcDtsMutation.isPending}
                                >
                                  <Calculator className="h-4 w-4 mr-2" />
                                  Recalculer DTS
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedCompany({ id: row.company_id, name: row.company_name });
                                    if (row.recommendations_suppressed) {
                                      toggleSuppressionMutation.mutate({ 
                                        companyId: row.company_id, 
                                        suppressed: false 
                                      });
                                    } else {
                                      setSuppressDialogOpen(true);
                                    }
                                  }}
                                >
                                  {row.recommendations_suppressed ? (
                                    <>
                                      <MessageSquare className="h-4 w-4 mr-2" />
                                      Réactiver recos
                                    </>
                                  ) : (
                                    <>
                                      <MessageSquareOff className="h-4 w-4 mr-2" />
                                      Suspendre recos
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedCompany({ id: row.company_id, name: row.company_name });
                                    setContactDialogOpen(true);
                                  }}
                                >
                                  <Phone className="h-4 w-4 mr-2" />
                                  Logger contact
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setSelectedCompany({ id: row.company_id, name: row.company_name });
                                    setEndBetaDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Terminer bêta
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Alertes actives</CardTitle>
                <CardDescription>
                  Problèmes détectés nécessitant une attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : !alerts?.length ? (
                  <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                    <p>Aucune alerte active</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entreprise</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>Sévérité</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map((alert, idx) => (
                        <TableRow key={`${alert.company_id}-${alert.alert_type}-${idx}`}>
                          <TableCell className="font-medium">{alert.company_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getAlertIcon(alert.alert_type)}
                              <span className="capitalize">{alert.alert_type.replace(/_/g, " ")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{alert.alert_reason}</TableCell>
                          <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Log Tab */}
          <TabsContent value="actions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Journal des actions</CardTitle>
                <CardDescription>
                  Dernières 50 actions opérationnelles
                </CardDescription>
              </CardHeader>
              <CardContent>
                {actionsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : !actionsLog?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Aucune action enregistrée
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actionsLog.map((action) => (
                        <TableRow key={action.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {format(new Date(action.created_at), "d MMM HH:mm", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(action.action_type)}
                              <span className="capitalize text-sm">
                                {action.action_type.replace(/beta_ops_/g, "").replace(/_/g, " ")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-md truncate">
                            {action.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Suppress Recommendations Dialog */}
      <Dialog open={suppressDialogOpen} onOpenChange={setSuppressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspendre les recommandations</DialogTitle>
            <DialogDescription>
              Les recommandations seront masquées pour {selectedCompany?.name}. 
              L'utilisateur verra un message indiquant que le support examine la qualité des données.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suppressReason">Raison (obligatoire)</Label>
              <Textarea
                id="suppressReason"
                placeholder="Ex: Trop d'anomalies d'import, en attente de corrections..."
                value={suppressReason}
                onChange={(e) => setSuppressReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuppressDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (!selectedCompany || !suppressReason.trim()) {
                  toast.error("Veuillez indiquer une raison");
                  return;
                }
                toggleSuppressionMutation.mutate({
                  companyId: selectedCompany.id,
                  suppressed: true,
                  reason: suppressReason,
                });
              }}
              disabled={toggleSuppressionMutation.isPending || !suppressReason.trim()}
            >
              Suspendre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Logger un contact</DialogTitle>
            <DialogDescription>
              Enregistrer une prise de contact avec {selectedCompany?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contactChannel">Canal</Label>
              <div className="flex gap-2">
                {["email", "phone", "chat"].map((ch) => (
                  <Button
                    key={ch}
                    type="button"
                    variant={contactChannel === ch ? "default" : "outline"}
                    size="sm"
                    onClick={() => setContactChannel(ch)}
                  >
                    {ch === "email" ? "Email" : ch === "phone" ? "Téléphone" : "Chat"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactNotes">Notes</Label>
              <Textarea
                id="contactNotes"
                placeholder="Résumé de l'échange..."
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (!selectedCompany) return;
                logContactMutation.mutate({
                  companyId: selectedCompany.id,
                  channel: contactChannel,
                  notes: contactNotes,
                });
              }}
              disabled={logContactMutation.isPending}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Beta Dialog */}
      <Dialog open={endBetaDialogOpen} onOpenChange={setEndBetaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Terminer le programme bêta</DialogTitle>
            <DialogDescription>
              Cette action est <strong>irréversible</strong>. Le tarif standard (29€/laverie/mois) 
              s'appliquera immédiatement pour {selectedCompany?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="endBetaReason">Raison</Label>
              <Textarea
                id="endBetaReason"
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
              onClick={() => {
                if (!selectedCompany) return;
                endBetaMutation.mutate({
                  companyId: selectedCompany.id,
                  reason: endBetaReason || "Fin anticipée par administrateur",
                });
              }}
              disabled={endBetaMutation.isPending}
            >
              Terminer le bêta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
