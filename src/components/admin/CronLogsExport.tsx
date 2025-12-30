import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  const exportToCSV = () => {
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

    // CSV rows
    const rows = logs.map(log => [
      log.id,
      log.job_name,
      format(new Date(log.started_at), "yyyy-MM-dd HH:mm:ss", { locale: fr }),
      log.completed_at ? format(new Date(log.completed_at), "yyyy-MM-dd HH:mm:ss", { locale: fr }) : "",
      log.status,
      log.sites_processed?.toString() || "0",
      log.sites_failed?.toString() || "0",
      log.duration_ms?.toString() || "",
      // Escape quotes and commas in error message
      log.error_message ? `"${log.error_message.replace(/"/g, '""')}"` : ""
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => 
        // Wrap cells containing special characters
        typeof cell === 'string' && (cell.includes(';') || cell.includes('\n') || cell.includes('"')) 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(";"))
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
