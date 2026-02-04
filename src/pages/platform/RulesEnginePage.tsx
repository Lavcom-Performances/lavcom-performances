/**
 * TAEX-247: Rules Engine Admin Page
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
  Zap,
  Edit,
  Trash2,
  Play,
  Filter
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RuleRecord {
  id: string;
  rule_id: string;
  knowledge_id: string | null;
  trigger: string;
  conditions: any;
  actions: any;
  severity: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TRIGGERS = ['on_import', 'on_kpi_refresh', 'on_diagnostic'];
const SEVERITIES = ['INFO', 'WARNING', 'BLOCKING'];

export default function RulesEnginePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<RuleRecord | null>(null);

  // Fetch rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ['kb_rules', search, triggerFilter, severityFilter],
    queryFn: async () => {
      let query = supabase
        .from('kb_rules')
        .select('*')
        .order('priority', { ascending: true });

      if (triggerFilter !== 'all') {
        query = query.eq('trigger', triggerFilter);
      }
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }
      if (search) {
        query = query.ilike('rule_id', `%${search}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as RuleRecord[];
    }
  });

  // Fetch knowledge for dropdown
  const { data: knowledgeList } = useQuery({
    queryKey: ['kb_knowledge_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_knowledge')
        .select('id, know_id, title_short')
        .eq('is_active', true)
        .order('know_id');
      if (error) throw error;
      return data;
    }
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (record: Partial<RuleRecord> & { id?: string }) => {
      if (record.id) {
        const { id, ...updateData } = record;
        const { error } = await supabase
          .from('kb_rules')
          .update(updateData as any)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kb_rules')
          .insert(record as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb_rules'] });
      toast.success(editRecord ? 'Règle mise à jour' : 'Règle créée');
      setIsCreateOpen(false);
      setEditRecord(null);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('kb_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb_rules'] });
      toast.success('Statut mis à jour');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kb_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb_rules'] });
      toast.success('Règle supprimée');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    let conditions = {};
    let actions = {};
    
    try {
      const conditionsStr = formData.get('conditions') as string;
      if (conditionsStr) conditions = JSON.parse(conditionsStr);
    } catch {
      toast.error('Format JSON invalide pour les conditions');
      return;
    }
    
    try {
      const actionsStr = formData.get('actions') as string;
      if (actionsStr) actions = JSON.parse(actionsStr);
    } catch {
      toast.error('Format JSON invalide pour les actions');
      return;
    }
    
    const record: any = {
      rule_id: formData.get('rule_id') as string,
      knowledge_id: formData.get('knowledge_id') as string || null,
      trigger: formData.get('trigger') as string,
      conditions,
      actions,
      severity: formData.get('severity') as string,
      priority: parseInt(formData.get('priority') as string) || 50,
      is_active: formData.get('is_active') === 'on',
    };

    if (editRecord) {
      record.id = editRecord.id;
    }

    saveMutation.mutate(record);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'BLOCKING': return 'bg-red-500';
      case 'WARNING': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case 'on_import': return 'Import';
      case 'on_kpi_refresh': return 'KPI Refresh';
      case 'on_diagnostic': return 'Diagnostic';
      default: return trigger;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Moteur de Règles
          </h1>
          <p className="text-muted-foreground">
            Configurez les règles de validation et d'automatisation
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditRecord(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle règle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editRecord ? 'Modifier la règle' : 'Nouvelle règle'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rule_id">ID Règle *</Label>
                  <Input 
                    id="rule_id" 
                    name="rule_id" 
                    placeholder="RULE_PAY_001"
                    defaultValue={editRecord?.rule_id}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="trigger">Déclencheur *</Label>
                  <Select name="trigger" defaultValue={editRecord?.trigger || 'on_import'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGERS.map(t => (
                        <SelectItem key={t} value={t}>{getTriggerLabel(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="knowledge_id">Connaissance liée</Label>
                <Select name="knowledge_id" defaultValue={editRecord?.knowledge_id || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune</SelectItem>
                    {knowledgeList?.map(k => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.know_id} - {k.title_short.substring(0, 30)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="conditions">Conditions (JSON)</Label>
                <Textarea 
                  id="conditions" 
                  name="conditions"
                  rows={4}
                  placeholder='{"all": [{"field": "payment_mode", "op": "neq", "value": "CB"}]}'
                  defaultValue={editRecord?.conditions ? JSON.stringify(editRecord.conditions, null, 2) : ''}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="actions">Actions (JSON)</Label>
                <Textarea 
                  id="actions" 
                  name="actions"
                  rows={4}
                  placeholder='{"set_invalid": true, "add_flags": ["INVALID"]}'
                  defaultValue={editRecord?.actions ? JSON.stringify(editRecord.actions, null, 2) : ''}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="severity">Sévérité *</Label>
                  <Select name="severity" defaultValue={editRecord?.severity || 'INFO'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priorité (1-100)</Label>
                  <Input 
                    id="priority" 
                    name="priority"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={editRecord?.priority || 50}
                  />
                </div>
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
            <Select value={triggerFilter} onValueChange={setTriggerFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Trigger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {TRIGGERS.map(t => (
                  <SelectItem key={t} value={t}>{getTriggerLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sévérité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {SEVERITIES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">P.</TableHead>
                  <TableHead className="w-[140px]">ID</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Sévérité</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : rules?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Aucune règle trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  rules?.map((r) => (
                    <TableRow key={r.id} className={!r.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-xs">{r.priority}</TableCell>
                      <TableCell className="font-mono text-xs">{r.rule_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTriggerLabel(r.trigger)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(r.severity)}>
                          {r.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs">
                        {JSON.stringify(r.conditions).substring(0, 40)}...
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={r.is_active}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: r.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditRecord(r);
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
                              if (confirm('Supprimer cette règle ?')) {
                                deleteMutation.mutate(r.id);
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
    </div>
  );
}
