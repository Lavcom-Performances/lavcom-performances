import { useState, useEffect } from "react";
import {
  Webhook,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  MessageSquare,
  Hash,
  Globe,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Webhook {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  type: string;
  is_enabled: boolean;
  created_at: string;
}

const WEBHOOK_TYPES = [
  { value: "discord", label: "Discord", icon: MessageSquare, color: "bg-indigo-100 text-indigo-800" },
  { value: "teams", label: "Microsoft Teams", icon: Hash, color: "bg-blue-100 text-blue-800" },
  { value: "slack", label: "Slack", icon: Hash, color: "bg-green-100 text-green-800" },
  { value: "custom", label: "URL personnalisée", icon: Globe, color: "bg-gray-100 text-gray-800" },
];

interface WebhookSettingsProps {
  organizationId: string | null;
}

export function WebhookSettings({ organizationId }: WebhookSettingsProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formType, setFormType] = useState("custom");

  const fetchWebhooks = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('permission_webhooks')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching webhooks:', error);
        return;
      }

      setWebhooks(data || []);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, [organizationId]);

  const resetForm = () => {
    setFormName("");
    setFormUrl("");
    setFormType("custom");
    setEditingWebhook(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormName(webhook.name);
    setFormUrl(webhook.url);
    setFormType(webhook.type);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!organizationId || !formName.trim() || !formUrl.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    // Validate URL
    try {
      new URL(formUrl);
    } catch {
      toast.error("URL invalide");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté");
        return;
      }

      if (editingWebhook) {
        // Update existing webhook
        const { error } = await supabase
          .from('permission_webhooks')
          .update({
            name: formName.trim(),
            url: formUrl.trim(),
            type: formType,
          })
          .eq('id', editingWebhook.id);

        if (error) throw error;
        toast.success("Webhook mis à jour");
      } else {
        // Create new webhook
        const { error } = await supabase
          .from('permission_webhooks')
          .insert({
            organization_id: organizationId,
            name: formName.trim(),
            url: formUrl.trim(),
            type: formType,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success("Webhook créé");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchWebhooks();
    } catch (error: any) {
      console.error('Error saving webhook:', error);
      if (error.code === '23505') {
        toast.error("Cette URL de webhook existe déjà");
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    try {
      const { error } = await supabase
        .from('permission_webhooks')
        .update({ is_enabled: !webhook.is_enabled })
        .eq('id', webhook.id);

      if (error) throw error;
      
      setWebhooks(prev => prev.map(w => 
        w.id === webhook.id ? { ...w, is_enabled: !w.is_enabled } : w
      ));
      
      toast.success(webhook.is_enabled ? "Webhook désactivé" : "Webhook activé");
    } catch (error) {
      console.error('Error toggling webhook:', error);
      toast.error("Erreur lors de la modification");
    }
  };

  const handleDelete = async () => {
    if (!deleteWebhookId) return;

    try {
      const { error } = await supabase
        .from('permission_webhooks')
        .delete()
        .eq('id', deleteWebhookId);

      if (error) throw error;
      
      toast.success("Webhook supprimé");
      setDeleteWebhookId(null);
      fetchWebhooks();
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getTypeInfo = (type: string) => {
    return WEBHOOK_TYPES.find(t => t.value === type) || WEBHOOK_TYPES[3];
  };

  if (!organizationId) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks personnalisés
            </CardTitle>
            <CardDescription>
              Recevez les alertes de permissions sur Discord, Teams ou d'autres outils
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingWebhook ? "Modifier le webhook" : "Ajouter un webhook"}
                </DialogTitle>
                <DialogDescription>
                  Les webhooks recevront les alertes lors de modifications sensibles de permissions
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Alertes Discord"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEBHOOK_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">URL du webhook</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                  />
                  {formType === "discord" && (
                    <p className="text-xs text-muted-foreground">
                      Paramètres du serveur → Intégrations → Webhooks → Créer un webhook
                    </p>
                  )}
                  {formType === "teams" && (
                    <p className="text-xs text-muted-foreground">
                      Canal → ⋯ → Connecteurs → Incoming Webhook
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingWebhook ? "Enregistrer" : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun webhook configuré</p>
            <p className="text-sm">Les alertes seront envoyées uniquement par email</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => {
              const typeInfo = getTypeInfo(webhook.type);
              return (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/20"
                >
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={webhook.is_enabled}
                      onCheckedChange={() => handleToggle(webhook)}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{webhook.name}</span>
                        <Badge className={typeInfo.color}>
                          <typeInfo.icon className="h-3 w-3 mr-1" />
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                        {webhook.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(webhook)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteWebhookId(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteWebhookId} onOpenChange={() => setDeleteWebhookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le webhook ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le webhook ne recevra plus les alertes de permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
