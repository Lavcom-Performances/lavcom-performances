import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Shield, Plus, Trash2, Globe, CheckCircle, XCircle, Loader2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
interface TrustedIP {
  id: string;
  ip_address: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export function TrustedIPsManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: trustedIPs, isLoading } = useQuery({
    queryKey: ['admin-trusted-ips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_trusted_ips')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TrustedIP[];
    }
  });

  const addIPMutation = useMutation({
    mutationFn: async ({ ip_address, description }: { ip_address: string; description: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('admin_trusted_ips')
        .insert({
          ip_address,
          description: description || null,
          created_by: user?.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trusted-ips'] });
      setIsDialogOpen(false);
      setNewIp("");
      setNewDescription("");
      toast.success("Adresse IP ajoutée à la liste blanche");
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error("Cette adresse IP existe déjà dans la liste");
      } else {
        toast.error("Erreur lors de l'ajout de l'IP");
      }
    }
  });

  const toggleIPMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('admin_trusted_ips')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trusted-ips'] });
      toast.success("Statut mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    }
  });

  const deleteIPMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_trusted_ips')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trusted-ips'] });
      toast.success("Adresse IP supprimée");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    }
  });

  const isValidIP = (ip: string): boolean => {
    // IPv4
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    // CIDR notation
    const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    
    return ipv4Pattern.test(ip) || ipv6Pattern.test(ip) || cidrPattern.test(ip);
  };

  const handleAddIP = () => {
    if (!newIp.trim()) {
      toast.error("Veuillez entrer une adresse IP");
      return;
    }

    if (!isValidIP(newIp.trim())) {
      toast.error("Format d'adresse IP invalide");
      return;
    }

    addIPMutation.mutate({ 
      ip_address: newIp.trim(), 
      description: newDescription.trim() 
    });
  };

  const handleExportCSV = () => {
    if (!trustedIPs?.length) {
      toast.error("Aucune IP à exporter");
      return;
    }

    const csvHeaders = "ip_address,description,is_active";
    const csvRows = trustedIPs.map(ip => 
      `"${ip.ip_address}","${ip.description || ""}","${ip.is_active}"`
    );
    const csvContent = [csvHeaders, ...csvRows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trusted-ips-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${trustedIPs.length} IP(s) exportée(s)`);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      // Skip header if present
      const startIndex = lines[0]?.toLowerCase().includes("ip_address") ? 1 : 0;
      
      const { data: { user } } = await supabase.auth.getUser();
      
      let imported = 0;
      let skipped = 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line (handle quoted values)
        const match = line.match(/^"?([^",]+)"?,?"?([^"]*)"?,?"?(true|false)?"?$/i);
        
        if (!match) {
          skipped++;
          continue;
        }

        const [, ipAddress, description, isActiveStr] = match;
        const cleanIp = ipAddress.trim();
        
        if (!isValidIP(cleanIp)) {
          skipped++;
          continue;
        }

        const isActive = isActiveStr?.toLowerCase() !== "false";

        const { error } = await supabase
          .from('admin_trusted_ips')
          .insert({
            ip_address: cleanIp,
            description: description?.trim() || null,
            is_active: isActive,
            created_by: user?.id
          });

        if (error) {
          if (error.message.includes('duplicate')) {
            skipped++;
          } else {
            console.error("Import error:", error);
            skipped++;
          }
        } else {
          imported++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['admin-trusted-ips'] });
      
      if (imported > 0) {
        toast.success(`${imported} IP(s) importée(s)${skipped > 0 ? `, ${skipped} ignorée(s)` : ""}`);
      } else if (skipped > 0) {
        toast.warning(`${skipped} ligne(s) ignorée(s) (doublons ou format invalide)`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erreur lors de l'import du fichier CSV");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Liste blanche d'IPs</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Importer
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCSV}
              disabled={!trustedIPs?.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une IP de confiance</DialogTitle>
                <DialogDescription>
                  Les connexions depuis cette adresse IP ne déclencheront jamais d'alerte suspecte.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ip">Adresse IP</Label>
                  <Input
                    id="ip"
                    placeholder="192.168.1.1 ou 10.0.0.0/24"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supporte IPv4, IPv6 et notation CIDR
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optionnel)</Label>
                  <Input
                    id="description"
                    placeholder="Bureau principal, VPN entreprise..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleAddIP} 
                  disabled={addIPMutation.isPending}
                >
                  {addIPMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Ajouter
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        </div>
        <CardDescription>
          Les adresses IP de confiance ne déclenchent jamais d'alertes de connexion suspecte
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !trustedIPs?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucune adresse IP de confiance configurée</p>
            <p className="text-sm">Ajoutez des IPs pour les exempter des alertes de sécurité</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adresse IP</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Ajoutée le</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trustedIPs.map((ip) => (
                <TableRow key={ip.id}>
                  <TableCell className="font-mono">{ip.ip_address}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ip.description || "-"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(ip.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={ip.is_active}
                        onCheckedChange={(checked) => 
                          toggleIPMutation.mutate({ id: ip.id, is_active: checked })
                        }
                        disabled={toggleIPMutation.isPending}
                      />
                      {ip.is_active ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactif
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteIPMutation.mutate(ip.id)}
                      disabled={deleteIPMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
