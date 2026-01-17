import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { sanitizeForCsv, buildCsvLine, logExport } from "@/lib/exports";

type CronLog = {
  id: string;
  job_name: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  sites_processed: number | null;
  sites_failed: number | null;
  duration_ms: number | null;
  error_message: string | null;
};

interface CronLogsExportProps {
  logs: CronLog[];
  disabled?: boolean;
}

export function CronLogsExport({ logs, disabled }: CronLogsExportProps) {
  const exportToCSV = async () => {
    if (!logs?.length) return;

    // CSV headers
    const headers = [
      "ID",
      "Job",
      "Démarré à",
      "Terminé à",
      "Statut",
      "Sites traités",
      "Sites échoués",
      "Durée (ms)",
      "Message d'erreur"
    ];

    // CSV rows - sanitize text fields for formula injection protection
    const rows = logs.map(log => [
      log.id,
      sanitizeForCsv(log.job_name),
      format(new Date(log.started_at), "yyyy-MM-dd HH:mm:ss", { locale: fr }),
      log.completed_at ? format(new Date(log.completed_at), "yyyy-MM-dd HH:mm:ss", { locale: fr }) : "",
      sanitizeForCsv(log.status),
      log.sites_processed ?? 0,
      log.sites_failed ?? 0,
      log.duration_ms ?? "",
      sanitizeForCsv(log.error_message || "")
    ]);

    // Build CSV content with proper escaping
    const csvContent = [
      headers.join(";"),
      ...rows.map(row => buildCsvLine(row, ";"))
    ].join("\n");

    // Add BOM for Excel UTF-8 compatibility
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cron-logs-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Audit log the export
    logExport({
      exportType: 'cron_logs_csv',
      recordCount: logs.length,
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToCSV}
      disabled={disabled || !logs?.length}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
