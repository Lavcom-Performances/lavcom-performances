import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search,
  MoreHorizontal,
  Wrench,
  BarChart3,
  Megaphone,
  Shield,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExpertRequest {
  id: string;
  expert_type: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const expertTypeConfig: Record<string, { label: string; icon: typeof Wrench; color: string; bgColor: string }> = {
  installation: { label: "Installation", icon: Wrench, color: "text-blue-600", bgColor: "bg-blue-500/10" },
  gestion: { label: "Gestion", icon: BarChart3, color: "text-green-600", bgColor: "bg-green-500/10" },
  management: { label: "Gestion", icon: BarChart3, color: "text-green-600", bgColor: "bg-green-500/10" },
  communication: { label: "Communication", icon: Megaphone, color: "text-purple-600", bgColor: "bg-purple-500/10" },
  assurance: { label: "Assurance", icon: Shield, color: "text-amber-600", bgColor: "bg-amber-500/10" },
  insurance: { label: "Assurance", icon: Shield, color: "text-amber-600", bgColor: "bg-amber-500/10" },
};

const statusConfig: Record<string, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  new: { label: "Nouveau", icon: Clock, variant: "default" },
  contacted: { label: "Contacté", icon: Mail, variant: "secondary" },
  in_progress: { label: "En cours", icon: Loader2, variant: "outline" },
  completed: { label: "Terminé", icon: CheckCircle2, variant: "secondary" },
  cancelled: { label: "Annulé", icon: XCircle, variant: "destructive" },
};

export default function AdminExpertRequests() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<ExpertRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ["expert-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expert_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ExpertRequest[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("expert_requests")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expert-requests"] });
      toast.success("Statut mis à jour");
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expert_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expert-requests"] });
      toast.success("Demande supprimée");
      setDetailDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error deleting request:", error);
      toast.error("Erreur lors de la suppression");
    },
  });

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.phone?.includes(searchQuery) ?? false);

    const matchesTab =
      activeTab === "all" ||
      request.status === activeTab ||
      (activeTab === "pending" && request.status === "new");

    return matchesSearch && matchesTab;
  });

  const counts = {
    all: requests.length,
    new: requests.filter((r) => r.status === "new").length,
    contacted: requests.filter((r) => r.status === "contacted").length,
    in_progress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  const handleViewDetails = (request: ExpertRequest) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
            Demandes d'experts
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {requests.length} demande{requests.length !== 1 ? "s" : ""} • {counts.new} nouvelle{counts.new !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-full sm:w-auto inline-flex">
            <TabsTrigger value="all" className="gap-1 text-xs sm:text-sm">
              Toutes
              <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-1 text-xs sm:text-sm">
              Nouvelles
              {counts.new > 0 && <Badge variant="default" className="ml-1">{counts.new}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="contacted" className="gap-1 text-xs sm:text-sm">
              Contactées
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="gap-1 text-xs sm:text-sm">
              En cours
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1 text-xs sm:text-sm">
              Terminées
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Search */}
          <div className="card-lavcom p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="card-lavcom overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Type d'expert</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Aucune demande trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => {
                      const expertConfig = expertTypeConfig[request.expert_type] || {
                        label: request.expert_type,
                        icon: Wrench,
                        color: "text-muted-foreground",
                        bgColor: "bg-muted",
                      };
                      const ExpertIcon = expertConfig.icon;
                      const status = statusConfig[request.status] || statusConfig.new;
                      const StatusIcon = status.icon;

                      return (
                        <TableRow
                          key={request.id}
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() => handleViewDetails(request)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{request.name}</span>
                              <span className="text-sm text-muted-foreground">{request.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", expertConfig.bgColor)}>
                                <ExpertIcon className={cn("h-4 w-4", expertConfig.color)} />
                              </div>
                              <span className="text-sm">{expertConfig.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(request.created_at), "dd MMM yyyy", { locale: fr })}
                            </span>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleStatusChange(request.id, "new")}>
                                  Nouveau
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(request.id, "contacted")}>
                                  Contacté
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(request.id, "in_progress")}>
                                  En cours
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(request.id, "completed")}>
                                  Terminé
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(request.id, "cancelled")}>
                                  Annulé
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => deleteRequestMutation.mutate(request.id)}
                                >
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {(() => {
                    const config = expertTypeConfig[selectedRequest.expert_type];
                    const Icon = config?.icon || Wrench;
                    return (
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config?.bgColor || "bg-muted")}>
                        <Icon className={cn("h-5 w-5", config?.color || "text-muted-foreground")} />
                      </div>
                    );
                  })()}
                  <div>
                    <span>Demande d'expert</span>
                    <DialogDescription>
                      {expertTypeConfig[selectedRequest.expert_type]?.label || selectedRequest.expert_type}
                    </DialogDescription>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Statut</span>
                  <Badge variant={statusConfig[selectedRequest.status]?.variant || "outline"}>
                    {statusConfig[selectedRequest.status]?.label || selectedRequest.status}
                  </Badge>
                </div>

                {/* Contact Info */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selectedRequest.email}`} className="text-primary hover:underline">
                      {selectedRequest.email}
                    </a>
                  </div>
                  {selectedRequest.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedRequest.phone}`} className="text-primary hover:underline">
                        {selectedRequest.phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedRequest.name}</span>
                  </div>
                </div>

                {/* Message */}
                {selectedRequest.message && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </div>
                    <p className="p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap">
                      {selectedRequest.message}
                    </p>
                  </div>
                )}

                {/* Date */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Reçue le</span>
                  <span>
                    {format(new Date(selectedRequest.created_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`mailto:${selectedRequest.email}`, "_blank")}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Envoyer un email
                  </Button>
                  {selectedRequest.phone && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(`tel:${selectedRequest.phone}`, "_blank")}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Appeler
                    </Button>
                  )}
                </div>

                {/* Quick Status Change */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground w-full mb-1">Marquer comme :</span>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <Button
                      key={key}
                      variant={selectedRequest.status === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        handleStatusChange(selectedRequest.id, key);
                        setSelectedRequest({ ...selectedRequest, status: key });
                      }}
                    >
                      {config.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
