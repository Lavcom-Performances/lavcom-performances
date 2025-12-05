import { useState, useRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Mock data for V1
const mockImportLogs = [
  { id: "1", fileName: "events_dec_2024.csv", importedAt: new Date(), user: "Jean Dupont", rowsRead: 1250, rowsInserted: 1180, rowsSkipped: 70 },
  { id: "2", fileName: "events_nov_2024.csv", importedAt: new Date(2024, 10, 28), user: "Marie Martin", rowsRead: 980, rowsInserted: 980, rowsSkipped: 0 },
  { id: "3", fileName: "events_oct_2024.csv", importedAt: new Date(2024, 9, 31), user: "Jean Dupont", rowsRead: 1102, rowsInserted: 1050, rowsSkipped: 52 },
];

export default function Imports() {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier CSV",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    // Simulated upload for V1
    setTimeout(() => {
      setIsUploading(false);
      toast({
        title: "Import réussi",
        description: "1250 lignes lues, 1180 ajoutées, 70 doublons ignorés",
      });
    }, 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
          Imports
        </h1>
        <p className="text-muted-foreground">
          Importez vos fichiers CSV "Events" depuis votre centrale de paiement
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "card-lavcom p-8 border-2 border-dashed transition-all duration-200 cursor-pointer",
          isDragOver && "border-primary bg-primary/5",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
        <div className="text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              <p className="text-lg font-medium">Import en cours...</p>
              <p className="text-sm text-muted-foreground">Veuillez patienter</p>
            </>
          ) : (
            <>
              <Upload className={cn(
                "h-12 w-12 mx-auto mb-4 transition-colors",
                isDragOver ? "text-primary" : "text-muted-foreground"
              )} />
              <p className="text-lg font-medium">
                Glissez-déposez votre fichier CSV ici
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ou cliquez pour parcourir
              </p>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4" />
                Sélectionner un fichier
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Import Logs */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-semibold">Historique des imports</h2>
        <div className="card-lavcom overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Fichier</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead className="text-right">Lignes lues</TableHead>
                <TableHead className="text-right">Ajoutées</TableHead>
                <TableHead className="text-right">Doublons</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockImportLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    {format(log.importedAt, "dd/MM/yyyy HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {log.fileName}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.user}</TableCell>
                  <TableCell className="text-right">{log.rowsRead.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">
                    +{log.rowsInserted.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {log.rowsSkipped > 0 ? log.rowsSkipped.toLocaleString() : "-"}
                  </TableCell>
                  <TableCell>
                    {log.rowsSkipped === 0 ? (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">Complet</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">Partiel</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
