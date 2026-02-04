/**
 * TAEX-247: FAQ Builder Admin Page
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
  HelpCircle,
  Edit,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FaqRecord {
  id: string;
  faq_id: string;
  knowledge_id: string | null;
  question: string;
  answer_simple: string;
  audience: string;
  tone: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

const AUDIENCES = ['public', 'operator', 'project_owner'];
const TONES = ['neutral', 'pedagogical'];

export default function FaqBuilderPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<FaqRecord | null>(null);

  // Fetch FAQ records
  const { data: faqs, isLoading } = useQuery({
    queryKey: ['kb_faq', search, audienceFilter],
    queryFn: async () => {
      let query = supabase
        .from('kb_faq')
        .select('*')
        .order('created_at', { ascending: false });

      if (audienceFilter !== 'all') {
        query = query.eq('audience', audienceFilter);
      }
      if (search) {
        query = query.or(`question.ilike.%${search}%,faq_id.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as FaqRecord[];
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
    mutationFn: async (record: Partial<FaqRecord> & { id?: string }) => {
      if (record.id) {
        const { id, ...updateData } = record;
        const { error } = await supabase
          .from('kb_faq')
          .update(updateData as any)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kb_faq')
          .insert(record as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb_faq'] });
      toast.success(editRecord ? 'FAQ mise à jour' : 'FAQ créée');
      setIsCreateOpen(false);
      setEditRecord(null);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Toggle publish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from('kb_faq')
        .update({ is_published })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb_faq'] });
      toast.success('Statut de publication mis à jour');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kb_faq')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb_faq'] });
      toast.success('FAQ supprimée');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    }
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const record: any = {
      faq_id: formData.get('faq_id') as string,
      knowledge_id: formData.get('knowledge_id') as string || null,
      question: formData.get('question') as string,
      answer_simple: formData.get('answer_simple') as string,
      audience: formData.get('audience') as string,
      tone: formData.get('tone') as string,
      is_published: formData.get('is_published') === 'on',
    };

    if (editRecord) {
      record.id = editRecord.id;
    }

    saveMutation.mutate(record);
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'public': return 'Public';
      case 'operator': return 'Exploitant';
      case 'project_owner': return 'Porteur de projet';
      default: return audience;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="h-6 w-6" />
            Constructeur FAQ
          </h1>
          <p className="text-muted-foreground">
            Gérez les questions/réponses publiques
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditRecord(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle FAQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {editRecord ? 'Modifier la FAQ' : 'Nouvelle FAQ'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="faq_id">ID FAQ *</Label>
                  <Input 
                    id="faq_id" 
                    name="faq_id" 
                    placeholder="FAQ_001"
                    defaultValue={editRecord?.faq_id}
                    required
                  />
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
              </div>

              <div>
                <Label htmlFor="question">Question *</Label>
                <Input 
                  id="question" 
                  name="question"
                  defaultValue={editRecord?.question}
                  required
                />
              </div>

              <div>
                <Label htmlFor="answer_simple">Réponse *</Label>
                <Textarea 
                  id="answer_simple" 
                  name="answer_simple"
                  rows={4}
                  defaultValue={editRecord?.answer_simple}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="audience">Audience *</Label>
                  <Select name="audience" defaultValue={editRecord?.audience || 'public'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map(a => (
                        <SelectItem key={a} value={a}>{getAudienceLabel(a)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tone">Ton *</Label>
                  <Select name="tone" defaultValue={editRecord?.tone || 'neutral'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch 
                  id="is_published" 
                  name="is_published"
                  defaultChecked={editRecord?.is_published ?? false}
                />
                <Label htmlFor="is_published">Publié</Label>
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
          <div className="flex gap-4">
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
            <Select value={audienceFilter} onValueChange={setAudienceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les audiences</SelectItem>
                {AUDIENCES.map(a => (
                  <SelectItem key={a} value={a}>{getAudienceLabel(a)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Publié</TableHead>
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
                ) : faqs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Aucune FAQ trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  faqs?.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.faq_id}</TableCell>
                      <TableCell className="max-w-[400px] truncate">{f.question}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getAudienceLabel(f.audience)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePublishMutation.mutate({ 
                            id: f.id, 
                            is_published: !f.is_published 
                          })}
                        >
                          {f.is_published ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditRecord(f);
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
                              if (confirm('Supprimer cette FAQ ?')) {
                                deleteMutation.mutate(f.id);
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
