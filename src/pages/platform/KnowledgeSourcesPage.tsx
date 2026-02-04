/**
 * TAEX-247: Knowledge Sources Admin Page
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
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  Library,
  Edit,
  Trash2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SourceRecord {
  id: string;
  source_type: string;
  source_name: string;
  default_reliability_label: string;
  notes_internal: string | null;
  created_at: string;
  updated_at: string;
}

const SOURCE_TYPES = ['manual', 'forum', 'manufacturer', 'internal', 'regulation', 'expert'];
const RELIABILITY_LABELS = ['EXPERT', 'TERRAIN', 'SYMPTOME'];

export default function KnowledgeSourcesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<SourceRecord | null>(null);

  // Fetch sources
  const { data: sources, isLoading } = useQuery({
    queryKey: ['kb_sources', search],
    queryFn: async () => {
      let query = supabase
        .from('kb_sources')
        .select('*')
        .order('source_name');

      if (search) {
        query = query.ilike('source_name', `%${search}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as SourceRecord[];
    }
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (record: Partial<SourceRecord> & { id?: string }) => {
      if (record.id) {
        const { id, ...updateData } = record;
        const { error } = await supabase
          .from('kb_sources')
          .update(updateData as any)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kb_sources')
          .insert(record as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb_sources'] });
      toast.success(editRecord ? 'Source mise à jour' : 'Source créée');
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
        .from('kb_sources')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb_sources'] });
      toast.success('Source supprimée');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const record: any = {
      source_type: formData.get('source_type') as string,
      source_name: formData.get('source_name') as string,
      default_reliability_label: formData.get('default_reliability_label') as string,
      notes_internal: formData.get('notes_internal') as string || null,
    };

    if (editRecord) {
      record.id = editRecord.id;
    }

    saveMutation.mutate(record);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'manual': return 'Manuel';
      case 'forum': return 'Forum';
      case 'manufacturer': return 'Fabricant';
      case 'internal': return 'Interne';
      case 'regulation': return 'Réglementation';
      case 'expert': return 'Expert';
      default: return type;
    }
  };

  const getReliabilityColor = (label: string) => {
    switch (label) {
      case 'EXPERT': return 'bg-green-500';
      case 'TERRAIN': return 'bg-blue-500';
      case 'SYMPTOME': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Library className="h-6 w-6" />
            Sources de Connaissances
          </h1>
          <p className="text-muted-foreground">
            Gérez les sources de référence pour la base de connaissances
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditRecord(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editRecord ? 'Modifier la source' : 'Nouvelle source'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="source_name">Nom de la source *</Label>
                <Input 
                  id="source_name" 
                  name="source_name"
                  placeholder="MEI CashFlow 7000 Manual"
                  defaultValue={editRecord?.source_name}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source_type">Type *</Label>
                  <Select name="source_type" defaultValue={editRecord?.source_type || 'manual'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{getTypeLabel(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="default_reliability_label">Fiabilité par défaut *</Label>
                  <Select name="default_reliability_label" defaultValue={editRecord?.default_reliability_label || 'TERRAIN'}>
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
              </div>

              <div>
                <Label htmlFor="notes_internal">Notes internes</Label>
                <Textarea 
                  id="notes_internal" 
                  name="notes_internal"
                  rows={3}
                  placeholder="Notes pour l'équipe..."
                  defaultValue={editRecord?.notes_internal || ''}
                />
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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une source..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sources Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Fiabilité</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : sources?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Aucune source trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  sources?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.source_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(s.source_type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getReliabilityColor(s.default_reliability_label)}>
                          {s.default_reliability_label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                        {s.notes_internal || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditRecord(s);
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
                              if (confirm('Supprimer cette source ?')) {
                                deleteMutation.mutate(s.id);
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
