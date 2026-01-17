import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Save, Info, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useUserGoals } from "@/hooks/useUserGoals";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { SEOHead } from "@/components/seo/SEOHead";
import { useUnsavedChangesWarning, UnsavedChangesDialog } from "@/hooks/useUnsavedChangesWarning";
import { useFormPersistence } from "@/hooks/useFormPersistence";

interface GoalsFormData {
  monthly_revenue_goal: string;
  annual_revenue_goal: string;
  monthly_transactions_goal: string;
}

const initialFormData: GoalsFormData = {
  monthly_revenue_goal: "",
  annual_revenue_goal: "",
  monthly_transactions_goal: "",
};

export default function GoalsSettingsPage() {
  const { t } = useTranslation(["app", "common"]);
  const navigate = useNavigate();
  const { currentSiteId } = useCurrentSite();
  const { goals, upsertGoals, isLoading } = useUserGoals(currentSiteId);

  // Form persistence - survives page refresh and browser crashes
  const {
    formData,
    setFormData,
    clearSavedData,
    hasSavedData,
    resetForm,
  } = useFormPersistence<GoalsFormData>({
    key: `goals-settings-${currentSiteId || 'default'}`,
    initialData: initialFormData,
    ttlMs: 24 * 60 * 60 * 1000, // 24 hours
    enabled: true,
  });

  const [initialFormDataFromServer, setInitialFormDataFromServer] = useState<GoalsFormData>(initialFormData);
  const [hasLoadedFromServer, setHasLoadedFromServer] = useState(false);

  // Initialize form with existing goals from server (only once, after loading)
  useEffect(() => {
    if (goals && !hasLoadedFromServer) {
      const serverData = {
        monthly_revenue_goal: goals.monthly_revenue_goal?.toString() || "",
        annual_revenue_goal: goals.annual_revenue_goal?.toString() || "",
        monthly_transactions_goal: goals.monthly_transactions_goal?.toString() || "",
      };
      setInitialFormDataFromServer(serverData);
      
      // Only update form if there's no saved draft
      if (!hasSavedData) {
        setFormData(serverData);
      }
      setHasLoadedFromServer(true);
    }
  }, [goals, hasLoadedFromServer, hasSavedData, setFormData]);

  // Check if form has unsaved changes (compared to server data)
  const isDirty = useMemo(() => {
    return (
      formData.monthly_revenue_goal !== initialFormDataFromServer.monthly_revenue_goal ||
      formData.annual_revenue_goal !== initialFormDataFromServer.annual_revenue_goal ||
      formData.monthly_transactions_goal !== initialFormDataFromServer.monthly_transactions_goal
    );
  }, [formData, initialFormDataFromServer]);

  // Check if we have a restored draft
  const hasRestoredDraft = useMemo(() => {
    return hasSavedData && isDirty;
  }, [hasSavedData, isDirty]);

  const { isBlocked, confirmNavigation, cancelNavigation } = useUnsavedChangesWarning({
    isDirty,
  });

  const handleClearDraft = useCallback(() => {
    resetForm();
    setFormData(initialFormDataFromServer);
  }, [resetForm, setFormData, initialFormDataFromServer]);

  const handleChange = (field: keyof GoalsFormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate annual if monthly changes
      if (field === "monthly_revenue_goal" && value) {
        const monthly = parseFloat(value);
        if (!isNaN(monthly)) {
          updated.annual_revenue_goal = (monthly * 12).toString();
        }
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const monthlyRevenue = parseFloat(formData.monthly_revenue_goal);
    
    if (!monthlyRevenue || isNaN(monthlyRevenue)) {
      toast.error(t("goals.monthlyRevenueRequired"));
      return;
    }

    try {
      await upsertGoals.mutateAsync({
        monthly_revenue_goal: monthlyRevenue,
        annual_revenue_goal: parseFloat(formData.annual_revenue_goal) || monthlyRevenue * 12,
        monthly_transactions_goal: parseInt(formData.monthly_transactions_goal) || 500,
        site_id: currentSiteId,
      });
      
      // Clear saved draft on successful submission
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearDraft}
                  className="h-7 text-xs gap-1"
                >
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
              <div className="space-y-4">
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

              <Button 
                type="submit" 
                className="w-full gap-2"
                disabled={upsertGoals.isPending}
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
