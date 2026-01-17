import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Save, Info } from "lucide-react";
import { toast } from "sonner";
import { useSiteCosts } from "@/hooks/useSiteCosts";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { SEOHead } from "@/components/seo/SEOHead";
import { useUnsavedChangesWarning, UnsavedChangesDialog } from "@/hooks/useUnsavedChangesWarning";

export default function CostsSettingsPage() {
  const { t } = useTranslation("app");
  const navigate = useNavigate();
  const { currentSiteId } = useCurrentSite();
  const { costs, upsertCosts, isLoading } = useSiteCosts(currentSiteId);

  const [formData, setFormData] = useState({
    fixed_rent: "",
    fixed_lease: "",
    fixed_subscriptions: "",
    fixed_insurance: "",
    fixed_cleaning: "",
    fixed_other: "",
    var_energy_water_percent: "",
    var_detergent_percent: "",
  });

  const [initialFormData, setInitialFormData] = useState({
    fixed_rent: "",
    fixed_lease: "",
    fixed_subscriptions: "",
    fixed_insurance: "",
    fixed_cleaning: "",
    fixed_other: "",
    var_energy_water_percent: "",
    var_detergent_percent: "",
  });

  // Initialize form with existing costs
  useEffect(() => {
    if (costs) {
      const data = {
        fixed_rent: costs.fixed_rent?.toString() || "",
        fixed_lease: costs.fixed_lease?.toString() || "",
        fixed_subscriptions: costs.fixed_subscriptions?.toString() || "",
        fixed_insurance: costs.fixed_insurance?.toString() || "",
        fixed_cleaning: costs.fixed_cleaning?.toString() || "",
        fixed_other: costs.fixed_other?.toString() || "",
        var_energy_water_percent: costs.var_energy_water_percent?.toString() || "",
        var_detergent_percent: costs.var_detergent_percent?.toString() || "",
      };
      setFormData(data);
      setInitialFormData(data);
    }
  }, [costs]);

  // Check if form has unsaved changes
  const isDirty = useMemo(() => {
    return Object.keys(formData).some(
      (key) => formData[key as keyof typeof formData] !== initialFormData[key as keyof typeof initialFormData]
    );
  }, [formData, initialFormData]);

  const { isBlocked, confirmNavigation, cancelNavigation } = useUnsavedChangesWarning({
    isDirty,
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentSiteId) {
      toast.error(t("costs.noSiteSelected"));
      return;
    }

    try {
      await upsertCosts.mutateAsync({
        fixed_rent: parseFloat(formData.fixed_rent) || 0,
        fixed_lease: parseFloat(formData.fixed_lease) || 0,
        fixed_subscriptions: parseFloat(formData.fixed_subscriptions) || 0,
        fixed_insurance: parseFloat(formData.fixed_insurance) || 0,
        fixed_cleaning: parseFloat(formData.fixed_cleaning) || 0,
        fixed_other: parseFloat(formData.fixed_other) || 0,
        var_energy_water_percent: parseFloat(formData.var_energy_water_percent) || 0,
        var_detergent_percent: parseFloat(formData.var_detergent_percent) || 0,
      });
      toast.success(t("costs.successMessage"));
      navigate("/dashboard");
    } catch (error) {
      toast.error(t("costs.errorMessage"));
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
        title={t("costs.pageTitle")}
        description={t("costs.pageDescription")}
        url="/settings/charges"
        noindex={true}
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/dashboard")} 
          className="mb-4 gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{t("costs.title")}</CardTitle>
            <CardDescription>{t("costs.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 mb-6 bg-muted/50 rounded-lg border border-border/50">
              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                {t("costs.helper")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Fixed costs */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">{t("costs.fixedCosts")}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fixed_rent">{t("costs.rent")}</Label>
                    <div className="relative">
                      <Input
                        id="fixed_rent"
                        type="number"
                        placeholder="0"
                        value={formData.fixed_rent}
                        onChange={(e) => handleChange("fixed_rent", e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fixed_lease">{t("costs.lease")}</Label>
                    <div className="relative">
                      <Input
                        id="fixed_lease"
                        type="number"
                        placeholder="0"
                        value={formData.fixed_lease}
                        onChange={(e) => handleChange("fixed_lease", e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fixed_subscriptions">{t("costs.subscriptions")}</Label>
                    <div className="relative">
                      <Input
                        id="fixed_subscriptions"
                        type="number"
                        placeholder="0"
                        value={formData.fixed_subscriptions}
                        onChange={(e) => handleChange("fixed_subscriptions", e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fixed_insurance">{t("costs.insurance")}</Label>
                    <div className="relative">
                      <Input
                        id="fixed_insurance"
                        type="number"
                        placeholder="0"
                        value={formData.fixed_insurance}
                        onChange={(e) => handleChange("fixed_insurance", e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fixed_cleaning">{t("costs.cleaning")}</Label>
                    <div className="relative">
                      <Input
                        id="fixed_cleaning"
                        type="number"
                        placeholder="0"
                        value={formData.fixed_cleaning}
                        onChange={(e) => handleChange("fixed_cleaning", e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fixed_other">{t("costs.other")}</Label>
                    <div className="relative">
                      <Input
                        id="fixed_other"
                        type="number"
                        placeholder="0"
                        value={formData.fixed_other}
                        onChange={(e) => handleChange("fixed_other", e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variable costs */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">{t("costs.variableCosts")}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="var_energy_water_percent">{t("costs.energyWater")}</Label>
                    <div className="relative">
                      <Input
                        id="var_energy_water_percent"
                        type="number"
                        placeholder="12"
                        value={formData.var_energy_water_percent}
                        onChange={(e) => handleChange("var_energy_water_percent", e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="var_detergent_percent">{t("costs.detergent")}</Label>
                    <div className="relative">
                      <Input
                        id="var_detergent_percent"
                        type="number"
                        placeholder="3"
                        value={formData.var_detergent_percent}
                        onChange={(e) => handleChange("var_detergent_percent", e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full gap-2"
                disabled={upsertCosts.isPending}
              >
                <Save className="h-4 w-4" />
                {upsertCosts.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
