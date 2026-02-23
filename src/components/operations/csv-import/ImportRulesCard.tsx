import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ImportRulesCard() {
  const { t } = useTranslation("app");

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>{t("csvImport.importRules.fast")}</p>
        <p>{t("csvImport.importRules.duplicates")}</p>
        <p>{t("csvImport.importRules.amounts")}</p>
      </div>
    </div>
  );
}
