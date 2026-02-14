import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Save, Info, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useUserGoals } from "@/hooks/useUserGoals";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { useKpiObjectives } from "@/hooks/useKpiObjectives";
import { SEOHead } from "@/components/seo/SEOHead";
import { useUnsavedChangesWarning, UnsavedChangesDialog } from "@/hooks/useUnsavedChangesWarning";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useDashboardStats } from "@/hooks/useDashboardStats";

interface GoalsFormData {
  monthly_revenue_goal: string;
  annual_revenue_goal: string;
  monthly_transactions_goal: string;
  // TAEX-311: Category objectives (in euros)
  wash_objective: string;
  dry_objective: string;
  product_objective: string;
}

const initialFormData: GoalsFormData = {
  monthly_revenue_goal: "",
  annual_revenue_goal: "",
  monthly_transactions_goal: "",
  wash_objective: "",
  dry_objective: "",
  product_objective: "",
};

export default function GoalsSettingsPage() {
  const { t } = useTranslation(["app", "common"]);
  const navigate = useNavigate();
  const { currentSiteId } = useCurrentSite();
  const { goals, upsertGoals, isLoading } = useUserGoals(currentSiteId);
  const { globalObjective, categoryObjectives, upsertObjective } = useKpiObjectives();
  const { stats } = useDashboardStats(undefined, currentSiteId ?? undefined);

  // Form persistence
  const {
    formData,
    setFormData,
    clearSavedData,
    hasSavedData,
    resetForm,
  } = useFormPersistence<GoalsFormData>({
    key: `goals-settings-${currentSiteId || 'default'}`,
    initialData: initialFormData,
    ttlMs: 24 * 60 * 60 * 1000,
    enabled: true,
  });

  const [initialFormDataFromServer, setInitialFormDataFromServer] = useState<GoalsFormData>(initialFormData);
  const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false);

  // Initialize form with existing goals from server
  useEffect(() => {
    if (goals && !hasLoadedFromServer) {
      const washObj = categoryObjectives.find(o => o.category === "WASH");
      const dryObj = categoryObjectives.find(o => o.category === "DRY");
      const prodObj = categoryObjectives.find(o => o.category === "PRODUCT");

      const serverData: GoalsFormData = {
        monthly_revenue_goal: globalObjective 
          ? (globalObjective.objective_amount_cents / 100).toString() 
          : (goals.monthly_revenue_goal?.toString() || ""),
        annual_revenue_goal: goals.annual_revenue_goal?.toString() || "",
        monthly_transactions_goal: goals.monthly_transactions_goal?.toString() || "",
        wash_objective: washObj ? (washObj.objective_amount_cents / 100).toString() : "",
        dry_objective: dryObj ? (dryObj.objective_amount_cents / 100).toString() : "",
        product_objective: prodObj ? (prodObj.objective_amount_cents / 100).toString() : "",
      };
      setInitialFormDataFromServer(serverData);
      
      if (!hasSavedData) {
        setFormData(serverData);
      }
      setHasLoadedFromServer(true);
    }
  }, [goals, globalObjective, categoryObjectives, hasLoadedFromServer, hasSavedData, setFormData]);

  const isDirty = useMemo(() => {
    return Object.keys(formData).some(
      key => formData[key as keyof GoalsFormData] !== initialFormDataFromServer[key as keyof GoalsFormData]
    );
  }, [formData, initialFormDataFromServer]);

  const hasRestoredDraft = useMemo(() => hasSavedData && isDirty, [hasSavedData, isDirty]);

  const { isBlocked, confirmNavigation, cancelNavigation } = useUnsavedChangesWarning({ isDirty });

  const handleClearDraft = useCallback(() => {
    resetForm();
    setFormData(initialFormDataFromServer);
  }, [resetForm, setFormData, initialFormDataFromServer]);

  const handleChange = (field: keyof GoalsFormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "monthly_revenue_goal" && value) {
        const monthly = parseFloat(value);
        if (!isNaN(monthly)) {
          updated.annual_revenue_goal = (monthly * 12).toString();
        }
      }
      return updated;
    });
  };

  // Auto-suggest from last month
  const handleAutoSuggest = () => {
    if (stats.totalRevenue > 0) {
      const suggested = Math.round(stats.totalRevenue * 1.03); // +3%
      handleChange("monthly_revenue_goal", suggested.toString());
      toast.info(t("goals.autoSuggestApplied", { defaultValue: "Objectif basé sur vos dernières performances (+3%)" }));
    } else {
      toast.warning(t("goals.noDataForSuggest", { defaultValue: "Pas assez de données pour une suggestion." }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const monthlyRevenue = parseFloat(formData.monthly_revenue_goal);
    
    if (!monthlyRevenue || isNaN(monthlyRevenue)) {
      toast.error(t("goals.monthlyRevenueRequired"));
      return;
    }

    try {
      // Save legacy goals
      await upsertGoals.mutateAsync({
        monthly_revenue_goal: monthlyRevenue,
        annual_revenue_goal: parseFloat(formData.annual_revenue_goal) || monthlyRevenue * 12,
        monthly_transactions_goal: parseInt(formData.monthly_transactions_goal) || 500,
        site_id: currentSiteId,
      });

      // Save TAEX-311 objectives
      await upsertObjective.mutateAsync({
        scope: "GLOBAL",
        objective_amount_cents: Math.round(monthlyRevenue * 100),
      });

      // Category objectives
      const categories = [
        { key: "wash_objective", cat: "WASH" },
        { key: "dry_objective", cat: "DRY" },
        { key: "product_objective", cat: "PRODUCT" },
      ] as const;

      for (const { key, cat } of categories) {
        const val = parseFloat(formData[key]);
        if (!isNaN(val) && val > 0) {
          await upsertObjective.mutateAsync({
            scope: "CATEGORY",
            category: cat,
            objective_amount_cents: Math.round(val * 100),
          });
        }
      }
      
      clearSavedData();
      toast.success(t("goals.successMessage"));
      navigate("/dashboard");
    } catch (error) {
      toast.error(t("goals.errorMessage"));
    }
  };

  return (
    <>
      <UnsavedChangesDialog
        isOpen={isBlocked}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
      <SEOHead 
        title={t("goals.pageTitle")}
        description={t("goals.pageDescription")}
        url="/settings/objectives"
        noindex={true}
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4 gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{t("goals.title")}</CardTitle>
            <CardDescription>{t("goals.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Draft restored indicator */}
            {hasRestoredDraft && (
              <div className="flex items-center justify-between gap-2 p-3 mb-4 bg-muted/50 rounded-lg border border-border/50 text-sm">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{t("common:draftRestored")}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearDraft} className="h-7 text-xs gap-1">
                  <RotateCcw className="h-3 w-3" />
                  {t("common:clearDraft")}
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-2 p-3 mb-6 bg-muted/50 rounded-lg border border-border/50">
              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                {t("goals.helper")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Global objective */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{t("goals.globalSection", { defaultValue: "Objectif global" })}</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={handleAutoSuggest} className="gap-1 text-xs">
                    <Sparkles className="h-3 w-3" />
                    {t("goals.autoSuggest", { defaultValue: "Suggestion auto" })}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_revenue_goal">
                    {t("goals.monthlyRevenue")} <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="monthly_revenue_goal"
                      type="number"
                      placeholder="5000"
                      value={formData.monthly_revenue_goal}
                      onChange={(e) => handleChange("monthly_revenue_goal", e.target.value)}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="annual_revenue_goal">{t("goals.annualRevenue")}</Label>
                  <div className="relative">
                    <Input
                      id="annual_revenue_goal"
                      type="number"
                      placeholder="60000"
                      value={formData.annual_revenue_goal}
                      onChange={(e) => handleChange("annual_revenue_goal", e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("goals.autoCalculated")}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_transactions_goal">{t("goals.monthlyTransactions")}</Label>
                  <Input
                    id="monthly_transactions_goal"
                    type="number"
                    placeholder="500"
                    value={formData.monthly_transactions_goal}
                    onChange={(e) => handleChange("monthly_transactions_goal", e.target.value)}
                  />
                </div>
              </div>

              {/* Category objectives - TAEX-311 */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-sm">{t("goals.categorySection", { defaultValue: "Objectifs par catégorie" })}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("goals.categoryHelper", { defaultValue: "Optionnel. Permet un suivi plus fin par type de machine." })}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wash_objective">{t("goals.wash", { defaultValue: "Lavage" })}</Label>
                    <div className="relative">
                      <Input
                        id="wash_objective"
                        type="number"
                        placeholder="2000"
                        value={formData.wash_objective}
                        onChange={(e) => handleChange("wash_objective", e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dry_objective">{t("goals.dry", { defaultValue: "Séchage" })}</Label>
                    <div className="relative">
                      <Input
                        id="dry_objective"
                        type="number"
                        placeholder="1500"
                        value={formData.dry_objective}
                        onChange={(e) => handleChange("dry_objective", e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product_objective">{t("goals.products", { defaultValue: "Produits" })}</Label>
                    <div className="relative">
                      <Input
                        id="product_objective"
                        type="number"
                        placeholder="500"
                        value={formData.product_objective}
                        onChange={(e) => handleChange("product_objective", e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full gap-2"
                disabled={upsertGoals.isPending || upsertObjective.isPending}
              >
                <Save className="h-4 w-4" />
                {upsertGoals.isPending ? t("common:saving") : t("common:save")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
