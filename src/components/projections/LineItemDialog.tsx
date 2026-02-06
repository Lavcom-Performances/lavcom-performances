import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateLineItem,
  useUpdateLineItem,
  type FinLineItem,
  type LineItemCategory,
} from "@/hooks/useFinLineItems";

const lineItemSchema = z.object({
  category: z.enum(["CYCLE", "PRODUCT", "OPTION"]),
  item_type: z.string().min(1, "Type requis"),
  label: z.string().min(1, "Libellé requis"),
  capacity_kg: z.coerce.number().nullable().optional(),
  quantity: z.coerce.number().int().min(1, "Minimum 1"),
  price_ttc_cents: z.coerce.number().min(0, "Prix invalide"),
  cycles_per_day_per_unit: z.coerce.number().min(0, "Valeur invalide"),
  open_days_per_month: z.coerce.number().int().min(1).max(31),
  utilization_rate: z.coerce.number().min(0).max(100, "Entre 0 et 100%"),
});

type FormData = z.infer<typeof lineItemSchema>;

interface LineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  editingItem: FinLineItem | null;
}

const ITEM_TYPES: Record<LineItemCategory, string[]> = {
  CYCLE: ["Washer", "Dryer"],
  PRODUCT: ["Product"],
  OPTION: ["Option"],
};

const TYPE_LABELS: Record<string, string> = {
  Washer: "Lave-linge",
  Dryer: "Sèche-linge",
  Product: "Produit",
  Option: "Option",
};

export function LineItemDialog({ open, onOpenChange, projectId, editingItem }: LineItemDialogProps) {
  const createItem = useCreateLineItem();
  const updateItem = useUpdateLineItem();
  
  const form = useForm<FormData>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: {
      category: "CYCLE",
      item_type: "Washer",
      label: "",
      capacity_kg: null,
      quantity: 1,
      price_ttc_cents: 500,
      cycles_per_day_per_unit: 8,
      open_days_per_month: 26,
      utilization_rate: 70,
    },
  });

  const category = form.watch("category");

  useEffect(() => {
    if (editingItem) {
      form.reset({
        category: editingItem.category,
        item_type: editingItem.item_type,
        label: editingItem.label,
        capacity_kg: editingItem.capacity_kg,
        quantity: editingItem.quantity,
        price_ttc_cents: editingItem.price_ttc_cents,
        cycles_per_day_per_unit: editingItem.cycles_per_day_per_unit,
        open_days_per_month: editingItem.open_days_per_month,
        utilization_rate: editingItem.utilization_rate * 100, // Convert to percentage
      });
    } else {
      form.reset({
        category: "CYCLE",
        item_type: "Washer",
        label: "",
        capacity_kg: null,
        quantity: 1,
        price_ttc_cents: 500,
        cycles_per_day_per_unit: 8,
        open_days_per_month: 26,
        utilization_rate: 70,
      });
    }
  }, [editingItem, form, open]);

  const onSubmit = (data: FormData) => {
    const payload = {
      category: data.category,
      item_type: data.item_type,
      label: data.label,
      quantity: data.quantity,
      price_ttc_cents: data.price_ttc_cents,
      cycles_per_day_per_unit: data.cycles_per_day_per_unit,
      open_days_per_month: data.open_days_per_month,
      capacity_kg: data.capacity_kg || null,
      utilization_rate: data.utilization_rate / 100, // Convert back to decimal
    };

    if (editingItem) {
      updateItem.mutate(
        { id: editingItem.id, projectId, ...payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createItem.mutate(
        { project_id: projectId, ...payload },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Modifier l'équipement" : "Nouvel équipement"}
          </DialogTitle>
          <DialogDescription>
            Configurez les paramètres de l'équipement ou service.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  form.setValue("category", v as LineItemCategory);
                  form.setValue("item_type", ITEM_TYPES[v as LineItemCategory][0]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CYCLE">Machine (Cycle)</SelectItem>
                  <SelectItem value="PRODUCT">Produit</SelectItem>
                  <SelectItem value="OPTION">Option</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.watch("item_type")}
                onValueChange={(v) => form.setValue("item_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES[category].map((type) => (
                    <SelectItem key={type} value={type}>
                      {TYPE_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Libellé</Label>
            <Input
              {...form.register("label")}
              placeholder="Ex: Lave-linge 8kg"
            />
            {form.formState.errors.label && (
              <p className="text-sm text-destructive">{form.formState.errors.label.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {category === "CYCLE" && (
              <div className="space-y-2">
                <Label>Capacité (kg)</Label>
                <Input
                  type="number"
                  step="0.5"
                  {...form.register("capacity_kg")}
                  placeholder="Ex: 8"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Quantité</Label>
              <Input
                type="number"
                {...form.register("quantity")}
                min={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prix TTC (centimes)</Label>
              <Input
                type="number"
                {...form.register("price_ttc_cents")}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                = {((form.watch("price_ttc_cents") || 0) / 100).toFixed(2)} €
              </p>
            </div>
            <div className="space-y-2">
              <Label>Cycles/ventes par jour/unité</Label>
              <Input
                type="number"
                step="0.5"
                {...form.register("cycles_per_day_per_unit")}
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jours d'ouverture/mois</Label>
              <Input
                type="number"
                {...form.register("open_days_per_month")}
                min={1}
                max={31}
              />
            </div>
            <div className="space-y-2">
              <Label>Taux d'utilisation (%)</Label>
              <Input
                type="number"
                {...form.register("utilization_rate")}
                min={0}
                max={100}
              />
            </div>
          </div>

          {/* Revenue Preview */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Revenu mensuel estimé</p>
            <p className="text-xl font-bold">
              {(() => {
                const qty = form.watch("quantity") || 0;
                const price = (form.watch("price_ttc_cents") || 0) / 100;
                const cycles = form.watch("cycles_per_day_per_unit") || 0;
                const days = form.watch("open_days_per_month") || 0;
                const rate = (form.watch("utilization_rate") || 0) / 100;
                const total = qty * price * cycles * days * rate;
                return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(total);
              })()}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {editingItem ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
