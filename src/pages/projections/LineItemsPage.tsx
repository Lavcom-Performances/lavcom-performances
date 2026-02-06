import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2, Settings, Power, PowerOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useFinProject } from "@/hooks/useFinProjects";
import {
  useFinLineItems,
  useInitializeLineItems,
  useCreateLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
  useTotalLineRevenue,
  type FinLineItem,
  type LineItemCategory,
} from "@/hooks/useFinLineItems";
import { useToast } from "@/hooks/use-toast";
import { LineItemDialog } from "@/components/projections/LineItemDialog";

const CATEGORY_LABELS: Record<LineItemCategory, string> = {
  CYCLE: "Machine",
  PRODUCT: "Produit",
  OPTION: "Option",
};

const CATEGORY_COLORS: Record<LineItemCategory, string> = {
  CYCLE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PRODUCT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  OPTION: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 }).format(value);
}

export default function LineItemsPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  const { toast } = useToast();
  
  const { data: project } = useFinProject(projectId || undefined);
  const { data: lineItems, isLoading } = useFinLineItems(projectId || undefined);
  const initializeItems = useInitializeLineItems();
  const updateItem = useUpdateLineItem();
  const deleteItem = useDeleteLineItem();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinLineItem | null>(null);
  
  const { totalTtc, byCategory } = useTotalLineRevenue(lineItems);

  if (!projectId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sélectionnez un projet pour configurer les équipements.</p>
      </div>
    );
  }

  const handleInitialize = () => {
    initializeItems.mutate(projectId);
  };

  const handleToggleActive = (item: FinLineItem) => {
    updateItem.mutate({
      id: item.id,
      projectId: item.project_id,
      is_active: !item.is_active,
    });
  };

  const handleDelete = (item: FinLineItem) => {
    if (confirm(`Supprimer "${item.label}" ?`)) {
      deleteItem.mutate({ id: item.id, projectId: item.project_id });
    }
  };

  const handleEdit = (item: FinLineItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const hasItems = lineItems && lineItems.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Machines & Services</h1>
          <p className="text-muted-foreground">
            {project?.name} — Configurez vos équipements et tarifs
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CA Mensuel TTC</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalTtc)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Machines (Cycles)</CardDescription>
            <CardTitle className="text-lg">{formatCurrency(byCategory.cycle)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Produits</CardDescription>
            <CardTitle className="text-lg">{formatCurrency(byCategory.product)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Options</CardDescription>
            <CardTitle className="text-lg">{formatCurrency(byCategory.option)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Line Items List */}
      {!hasItems && !isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun équipement configuré</h3>
            <p className="text-muted-foreground text-center mb-4">
              Ajoutez vos machines, produits et options pour calculer votre CA prévisionnel.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter manuellement
              </Button>
              <Button variant="outline" onClick={handleInitialize} disabled={initializeItems.isPending}>
                Initialiser avec des exemples
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Équipements ({lineItems?.length || 0})</CardTitle>
            <CardDescription>
              Cliquez sur une ligne pour modifier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lineItems?.map((item) => {
                const monthlyRevenue = (item.price_ttc_cents / 100) * item.quantity * item.cycles_per_day_per_unit * item.open_days_per_month * item.utilization_rate;
                
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      item.is_active 
                        ? "bg-card hover:bg-muted/50 cursor-pointer" 
                        : "bg-muted/30 opacity-60"
                    }`}
                    onClick={() => handleEdit(item)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    <Badge className={CATEGORY_COLORS[item.category]}>
                      {CATEGORY_LABELS[item.category]}
                    </Badge>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{item.label}</span>
                        {item.capacity_kg && (
                          <span className="text-sm text-muted-foreground">
                            {item.capacity_kg} kg
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.quantity}× · {formatCurrency(item.price_ttc_cents / 100)}/cycle · {item.cycles_per_day_per_unit} cycles/j · {formatPercent(item.utilization_rate)} util.
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className="font-medium">{formatCurrency(monthlyRevenue)}</div>
                      <div className="text-sm text-muted-foreground">/mois</div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => handleToggleActive(item)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <LineItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        editingItem={editingItem}
      />
    </div>
  );
}
