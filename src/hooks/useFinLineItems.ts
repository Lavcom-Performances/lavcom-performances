import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type LineItemCategory = "CYCLE" | "PRODUCT" | "OPTION";

export interface FinLineItem {
  id: string;
  project_id: string;
  scenario_id: string | null;
  category: LineItemCategory;
  item_type: string;
  capacity_kg: number | null;
  label: string;
  code: string | null;
  quantity: number;
  price_ttc_cents: number;
  cycles_per_day_per_unit: number;
  open_days_per_month: number;
  utilization_rate: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLineItemInput {
  project_id: string;
  scenario_id?: string | null;
  category: LineItemCategory;
  item_type: string;
  capacity_kg?: number | null;
  label: string;
  code?: string | null;
  quantity: number;
  price_ttc_cents: number;
  cycles_per_day_per_unit: number;
  open_days_per_month: number;
  utilization_rate: number;
  is_active?: boolean;
  sort_order?: number;
}

export const DEFAULT_LINE_ITEMS: Omit<CreateLineItemInput, "project_id">[] = [
  {
    category: "CYCLE",
    item_type: "Washer",
    capacity_kg: 8,
    label: "Lave-linge 8kg",
    quantity: 4,
    price_ttc_cents: 500, // 5.00€
    cycles_per_day_per_unit: 8,
    open_days_per_month: 26,
    utilization_rate: 0.65,
    sort_order: 0,
  },
  {
    category: "CYCLE",
    item_type: "Washer",
    capacity_kg: 12,
    label: "Lave-linge 12kg",
    quantity: 2,
    price_ttc_cents: 700, // 7.00€
    cycles_per_day_per_unit: 6,
    open_days_per_month: 26,
    utilization_rate: 0.55,
    sort_order: 1,
  },
  {
    category: "CYCLE",
    item_type: "Washer",
    capacity_kg: 18,
    label: "Lave-linge 18kg",
    quantity: 1,
    price_ttc_cents: 1000, // 10.00€
    cycles_per_day_per_unit: 4,
    open_days_per_month: 26,
    utilization_rate: 0.45,
    sort_order: 2,
  },
  {
    category: "CYCLE",
    item_type: "Dryer",
    capacity_kg: 14,
    label: "Sèche-linge 14kg",
    quantity: 3,
    price_ttc_cents: 200, // 2.00€
    cycles_per_day_per_unit: 10,
    open_days_per_month: 26,
    utilization_rate: 0.70,
    sort_order: 3,
  },
  {
    category: "PRODUCT",
    item_type: "Product",
    label: "Lessive (sachet)",
    quantity: 1,
    price_ttc_cents: 150, // 1.50€
    cycles_per_day_per_unit: 15, // sales per day
    open_days_per_month: 26,
    utilization_rate: 1.0,
    sort_order: 4,
  },
  {
    category: "OPTION",
    item_type: "Option",
    label: "Essorage supplémentaire",
    quantity: 1,
    price_ttc_cents: 100, // 1.00€
    cycles_per_day_per_unit: 5,
    open_days_per_month: 26,
    utilization_rate: 1.0,
    sort_order: 5,
  },
];

export function useFinLineItems(projectId: string | undefined, scenarioId?: string | null) {
  return useQuery({
    queryKey: ["fin-line-items", projectId, scenarioId],
    queryFn: async (): Promise<FinLineItem[]> => {
      if (!projectId) throw new Error("No project ID");
      
      let query = supabase
        .from("fin_line_items")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      
      if (scenarioId) {
        query = query.or(`scenario_id.is.null,scenario_id.eq.${scenarioId}`);
      } else {
        query = query.is("scenario_id", null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FinLineItem[];
    },
    enabled: !!projectId,
  });
}

export function useInitializeLineItems() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const items = DEFAULT_LINE_ITEMS.map((item) => ({
        ...item,
        project_id: projectId,
      }));
      
      const { error } = await supabase
        .from("fin_line_items")
        .insert(items);
      
      if (error) throw error;
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["fin-line-items", projectId] });
      toast({ title: "Équipements initialisés" });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useCreateLineItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateLineItemInput) => {
      const { data: item, error } = await supabase
        .from("fin_line_items")
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return item;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["fin-line-items", item.project_id] });
      toast({ title: "Élément ajouté" });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useUpdateLineItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: Partial<FinLineItem> & { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("fin_line_items")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fin-line-items", result.projectId] });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

export function useDeleteLineItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("fin_line_items")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fin-line-items", result.projectId] });
      toast({ title: "Élément supprimé" });
    },
    onError: (error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

// Calculate monthly revenue from line items
export function calculateLineItemRevenue(item: FinLineItem): number {
  const priceTtc = item.price_ttc_cents / 100;
  return priceTtc * item.quantity * item.cycles_per_day_per_unit * item.open_days_per_month * item.utilization_rate;
}

export function useTotalLineRevenue(items: FinLineItem[] | undefined) {
  if (!items || items.length === 0) {
    return { totalTtc: 0, byCategory: { cycle: 0, product: 0, option: 0 } };
  }
  
  const activeItems = items.filter(i => i.is_active);
  
  let totalTtc = 0;
  const byCategory = { cycle: 0, product: 0, option: 0 };
  
  for (const item of activeItems) {
    const revenue = calculateLineItemRevenue(item);
    totalTtc += revenue;
    
    switch (item.category) {
      case "CYCLE":
        byCategory.cycle += revenue;
        break;
      case "PRODUCT":
        byCategory.product += revenue;
        break;
      case "OPTION":
        byCategory.option += revenue;
        break;
    }
  }
  
  return { totalTtc, byCategory };
}
