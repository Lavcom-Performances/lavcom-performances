/**
 * Multi-CSV Import Summary with CB/ESP/FI totals
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Banknote, Gift, FileText, Calendar, Hash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MultiCsvParsedRow, MultiCsvSummary, calculateMultiCsvSummary, MultiCsvFile } from "@/lib/csv/multiCsvTypes";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface MultiCsvSummaryCardProps {
  files: MultiCsvFile[];
  rows: MultiCsvParsedRow[];
}

export function MultiCsvSummaryCard({ files, rows }: MultiCsvSummaryCardProps) {
  const { t } = useTranslation("app");

  const summary = useMemo(() => calculateMultiCsvSummary(files, rows), [files, rows]);

  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return '—';
    try {
      return format(parseISO(isoDate), 'dd/MM/yyyy', { locale: fr });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-4">
      {/* Main totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total CB + ESP */}
        <Card className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <span className="text-lg">+</span>
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t("csvImport.summary.totalCbEsp")}</p>
                <p className="text-2xl font-bold text-foreground">
                  {summary.total_cb_esp_display.toFixed(2)} €
                </p>
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-muted-foreground">CB:</span>
                <span className="font-medium">{(summary.total_cb_cents / 100).toFixed(2)} €</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-muted-foreground">ESP:</span>
                <span className="font-medium">{(summary.total_esp_cents / 100).toFixed(2)} €</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total FI */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Gift className="h-5 w-5 text-purple-600" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t("csvImport.summary.totalFi")}</p>
                <p className="text-2xl font-bold text-foreground">
                  {summary.total_fi_display.toFixed(2)} €
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t("csvImport.summary.totalLines")}</p>
                <p className="text-lg font-semibold">{summary.total_rows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t("csvImport.summary.transactions")}</p>
                <p className="text-lg font-semibold text-green-600">{summary.selected_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t("csvImport.summary.period")}</p>
                <p className="text-sm font-medium">
                  {summary.min_date && summary.max_date
                    ? `${formatDate(summary.min_date)} → ${formatDate(summary.max_date)}`
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={summary.to_review_count > 0 ? "border-amber-500/50" : ""}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-xs text-muted-foreground">{t("csvImport.lines.toReview")}</p>
                <p className={`text-lg font-semibold ${summary.to_review_count > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {summary.to_review_count}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
