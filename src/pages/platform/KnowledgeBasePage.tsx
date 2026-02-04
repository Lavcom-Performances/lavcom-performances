/**
 * TAEX-247: Knowledge Base Admin Page
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  BookOpen, 
  History,
  Edit,
  Trash2,
  Filter
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KnowledgeRecord {
  id: string;
  know_id: string;
  pillar: string;
  sub_pillar: string | null;
  truth_type: string;
  title_short: string;
  description_long: string;
  business_impact: string;
  urgency: string;
  source_id: string | null;
  reliability_label: string;
  applicable_if: any;
  not_applicable_if: any;
  ai_usage: string[];
  status: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface KnowledgeVersion {
  id: string;
  knowledge_id: string;
  version: number;
  snapshot: any;
  change_summary: string | null;
  created_at: string;
}

const PILLARS = ['Payment', 'Maintenance', 'UX', 'Marketing', 'Data', 'Operations'];
const TRUTH_TYPES = ['technical', 'behavioral', 'marketing', 'data'];
const BUSINESS_IMPACTS = ['CA', 'COST', 'UX', 'DOWNTIME', 'DATA_RELIABILITY'];
const URGENCIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const RELIABILITY_LABELS = ['EXPERT', 'TERRAIN', 'SYMPTOME'];
const STATUSES = ['VALIDATED', 'TO_CONFIRM', 'MONITOR'];

export default function KnowledgeBasePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pillarFilter, setPillarFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<KnowledgeRecord | null>(null);
  const [historyRecord, setHistoryRecord] = useState<KnowledgeRecord | null>(null);

  // Fetch knowledge records
  const { data: knowledge, isLoading } = useQuery({
    queryKey: ['kb_knowledge', search, pillarFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('kb_knowledge')
        .select('*')
        .order('created_at', { ascending: false });

      if (pillarFilter !== 'all') {
        query = query.eq('pillar', pillarFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (search) {
        query = query.or(`title_short.ilike.%${search}%,know_id.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as KnowledgeRecord[];
    }
  });

  // Fetch sources for dropdown
  const { data: sources } = useQuery({
    queryKey: ['kb_sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_sources')
        .select('id, source_name')
        .order('source_name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch version history
  const { data: versions } = useQuery({
    queryKey: ['kb_knowledge_versions', historyRecord?.id],
    queryFn: async () => {
      if (!historyRecord) return [];
      const { data, error } = await supabase
        .from('kb_knowledge_versions')
        .select('*')
        .eq('knowledge_id', historyRecord.id)
        .order('version', { ascending: false });
      if (error) throw error;
      return data as KnowledgeVersion[];
    },
    enabled: !!historyRecord
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (record: Partial<KnowledgeRecord> & { id?: string }) => {
      if (record.id) {
        // Update - bump version
        const { id, ...updateData } = record;
        const { error } = await supabase
          .from('kb_knowledge')
          .update({
            ...updateData,
            version: (editRecord?.version || 1) + 1
          } as any)
          .eq('id', id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('kb_knowledge')
          .insert(record as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb_knowledge'] });
      toast.success(editRecord ? 'Connaissance mise à jour' : 'Connaissance créée');
      setIsCreateOpen(false);
      setEditRecord(null);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kb_knowledge')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb_knowledge'] });
      toast.success('Connaissance supprimée');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const record: any = {
      know_id: formData.get('know_id') as string,
      pillar: formData.get('pillar') as string,
      sub_pillar: formData.get('sub_pillar') as string || null,
      truth_type: formData.get('truth_type') as string,
      title_short: formData.get('title_short') as string,
      description_long: formData.get('description_long') as string,
      business_impact: formData.get('business_impact') as string,
      urgency: formData.get('urgency') as string,
      source_id: formData.get('source_id') as string || null,
      reliability_label: formData.get('reliability_label') as string,
      status: formData.get('status') as string,
      is_active: formData.get('is_active') === 'on',
      ai_usage: (formData.get('ai_usage') as string)?.split(',').map(s => s.trim()).filter(Boolean) || [],
    };

    if (editRecord) {
      record.id = editRecord.id;
    }

    saveMutation.mutate(record);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VALIDATED': return 'bg-green-500';
      case 'TO_CONFIRM': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Base de Connaissances
          </h1>
          <p className="text-muted-foreground">
            Gérez les vérités et règles métier de LAVCOM
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditRecord(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle connaissance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editRecord ? 'Modifier la connaissance' : 'Nouvelle connaissance'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="know_id">ID Connaissance *</Label>
                  <Input 
                    id="know_id" 
                    name="know_id" 
                    placeholder="KB_PAY_001"
                    defaultValue={editRecord?.know_id}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pillar">Pilier *</Label>
                  <Select name="pillar" defaultValue={editRecord?.pillar || 'Payment'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PILLARS.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title_short">Titre court *</Label>
                <Input 
                  id="title_short" 
                  name="title_short"
                  defaultValue={editRecord?.title_short}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description_long">Description détaillée *</Label>
                <Textarea 
                  id="description_long" 
                  name="description_long"
                  rows={4}
                  defaultValue={editRecord?.description_long}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="truth_type">Type *</Label>
                  <Select name="truth_type" defaultValue={editRecord?.truth_type || 'technical'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRUTH_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="business_impact">Impact *</Label>
                  <Select name="business_impact" defaultValue={editRecord?.business_impact || 'CA'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_IMPACTS.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="urgency">Urgence *</Label>
                  <Select name="urgency" defaultValue={editRecord?.urgency || 'MEDIUM'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {URGENCIES.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reliability_label">Fiabilité *</Label>
                  <Select name="reliability_label" defaultValue={editRecord?.reliability_label || 'TERRAIN'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELIABILITY_LABELS.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Statut *</Label>
                  <Select name="status" defaultValue={editRecord?.status || 'TO_CONFIRM'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="source_id">Source</Label>
                <Select name="source_id" defaultValue={editRecord?.source_id || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.source_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ai_usage">Usages IA (séparés par virgule)</Label>
                <Input 
                  id="ai_usage" 
                  name="ai_usage"
                  placeholder="diagnostic, alert, exclude_kpi"
                  defaultValue={editRecord?.ai_usage?.join(', ')}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch 
                  id="is_active" 
                  name="is_active"
                  defaultChecked={editRecord?.is_active ?? true}
                />
                <Label htmlFor="is_active">Actif</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateOpen(false);
                  setEditRecord(null);
                }}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={pillarFilter} onValueChange={setPillarFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Pilier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les piliers</SelectItem>
                {PILLARS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">ID</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Pilier</TableHead>
                  <TableHead>Urgence</TableHead>
                  <TableHead>Fiabilité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>V.</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : knowledge?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Aucune connaissance trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  knowledge?.map((k) => (
                    <TableRow key={k.id} className={!k.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-xs">{k.know_id}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{k.title_short}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{k.pillar}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getUrgencyColor(k.urgency)}>
                          {k.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{k.reliability_label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(k.status)}>
                          {k.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{k.version}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setHistoryRecord(k)}
                            title="Historique"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditRecord(k);
                              setIsCreateOpen(true);
                            }}
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Supprimer cette connaissance ?')) {
                                deleteMutation.mutate(k.id);
                              }
                            }}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Version History Dialog */}
      <Dialog open={!!historyRecord} onOpenChange={() => setHistoryRecord(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Historique: {historyRecord?.know_id}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {versions?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Aucun historique disponible
              </p>
            ) : (
              <div className="space-y-4">
                {versions?.map((v) => (
                  <Card key={v.id}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Version {v.version}</CardTitle>
                        <span className="text-xs text-muted-foreground">
                          {new Date(v.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-sm text-muted-foreground">
                        {v.change_summary || 'Modification enregistrée'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
