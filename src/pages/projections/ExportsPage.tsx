import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, FileText, FileSpreadsheet, Clock, CheckCircle, AlertCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinProject } from "@/hooks/useFinProjects";
import { useFinForecasts, useAnnualSummary } from "@/hooks/useFinForecast";
import { useFinHypotheses } from "@/hooks/useFinHypotheses";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

type ExportType = "pdf" | "excel" | "bank_pdf";

export default function ExportsPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  const { toast } = useToast();
  
  const { data: project } = useFinProject(projectId || undefined);
  const { data: forecasts } = useFinForecasts(projectId || undefined);
  const { data: hypotheses } = useFinHypotheses(projectId || undefined);
  const annualSummary = useAnnualSummary(forecasts);
  
  const [exporting, setExporting] = useState<ExportType | null>(null);

  if (!projectId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sélectionnez un projet pour exporter.</p>
      </div>
    );
  }

  const hasData = forecasts && forecasts.length > 0;

  const handleExportExcel = async () => {
    if (!project || !forecasts || !hypotheses) return;
    
    setExporting("excel");
    try {
      let csv = "Prévisionnel Financier - " + project.name + "\n";
      csv += "Généré le " + format(new Date(), "d MMMM yyyy à HH:mm", { locale: fr }) + "\n\n";
      
      csv += "=== HYPOTHÈSES ===\n";
      csv += "Catégorie;Paramètre;Valeur;Unité\n";
      hypotheses.forEach(h => {
        const isPercentage = (h.meta as { isPercentage?: boolean })?.isPercentage;
        const displayValue = isPercentage ? (Number(h.value) * 100).toFixed(1) + "%" : h.value;
        csv += `${h.category};${h.label || h.key};${displayValue};${h.unit || ""}\n`;
      });
      
      csv += "\n=== SYNTHÈSE ANNUELLE ===\n";
      csv += "Année;CA;Charges;EBITDA;Cashflow;Trésorerie cumulée\n";
      annualSummary.forEach(y => {
        csv += `Année ${y.year};${y.total_revenue};${y.total_costs};${y.total_ebitda};${y.total_cashflow};${y.final_cumulative}\n`;
      });
      
      csv += "\n=== DÉTAIL MENSUEL ===\n";
      csv += "Année;Mois;CA;Charges;EBITDA;Cashflow;Trésorerie cumulée\n";
      forecasts.forEach(f => {
        csv += `${f.year};${MONTH_NAMES[f.month - 1]};${f.revenue};${f.costs};${f.ebitda};${f.cashflow};${f.cumulative_cashflow}\n`;
      });
      
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `previsionnel-${project.name.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ title: "Export réussi", description: "Le fichier a été téléchargé." });
    } catch (error) {
      toast({ title: "Erreur d'export", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    if (!project || !forecasts || !hypotheses) return;
    
    setExporting("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(20);
      doc.text("Prévisionnel Financier", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(14);
      doc.text(project.name, pageWidth / 2, 30, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`, pageWidth / 2, 38, { align: "center" });
      
      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.text("Hypothèses", 14, 50);
      
      const hypRows = hypotheses.map(h => {
        const isPercentage = (h.meta as { isPercentage?: boolean })?.isPercentage;
        const displayValue = isPercentage ? (Number(h.value) * 100).toFixed(1) + "%" : formatCurrency(Number(h.value));
        return [h.category, h.label || h.key, displayValue];
      });
      
      autoTable(doc, {
        startY: 55,
        head: [["Catégorie", "Paramètre", "Valeur"]],
        body: hypRows,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
      });
      
      const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 100;
      doc.text("Synthèse Annuelle", 14, finalY + 15);
      
      const annualRows = annualSummary.map(y => [
        `Année ${y.year}`,
        formatCurrency(y.total_revenue),
        formatCurrency(y.total_costs),
        formatCurrency(y.total_ebitda),
        formatCurrency(y.final_cumulative),
      ]);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [["Année", "CA", "Charges", "EBITDA", "Trésorerie"]],
        body: annualRows,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
      });
      
      doc.save(`previsionnel-${project.name.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      
      toast({ title: "Export réussi", description: "Le PDF a été téléchargé." });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ title: "Erreur d'export", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  const handleExportBankPDF = async () => {
    if (!project) return;
    
    setExporting("bank_pdf");
    try {
      const { data, error } = await supabase.functions.invoke("generate-financial-pdf", {
        body: { projectId, scenarioId: null },
      });

      if (error) throw error;
      
      if (data?.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
        toast({ 
          title: "Export réussi", 
          description: "Le PDF Banque a été généré et téléchargé." 
        });
      }
    } catch (error) {
      console.error("Bank PDF export error:", error);
      toast({ 
        title: "Erreur d'export", 
        description: "Une erreur est survenue lors de la génération.", 
        variant: "destructive" 
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exports</h1>
        <p className="text-muted-foreground">
          {project?.name} — Téléchargez votre prévisionnel
        </p>
      </div>

      {!hasData ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune donnée à exporter</h3>
            <p className="text-muted-foreground text-center">
              Calculez d'abord votre prévisionnel dans l'onglet "Prévisionnel"
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Bank-Grade PDF - Primary Export */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-primary/50 bg-primary/5" onClick={handleExportBankPDF}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                PDF Banque (complet)
              </CardTitle>
              <CardDescription>
                Document professionnel avec Compte de résultat, Bilan, Trésorerie mensuelle, Plan de financement et BFR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                disabled={exporting === "bank_pdf"}
                onClick={e => { e.stopPropagation(); handleExportBankPDF(); }}
              >
                {exporting === "bank_pdf" ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger PDF Banque
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Simple PDF */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleExportPDF}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-destructive" />
                Export PDF Simple
              </CardTitle>
              <CardDescription>
                Document simplifié avec hypothèses et synthèse annuelle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                disabled={exporting === "pdf"}
                onClick={e => { e.stopPropagation(); handleExportPDF(); }}
              >
                {exporting === "pdf" ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Excel/CSV */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleExportExcel}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                Export Excel (CSV)
              </CardTitle>
              <CardDescription>
                Tableur avec hypothèses, synthèse annuelle et détail mensuel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                disabled={exporting === "excel"}
                onClick={e => { e.stopPropagation(); handleExportExcel(); }}
              >
                {exporting === "excel" ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger CSV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-muted/50">
        <CardContent className="flex items-start gap-3 py-4">
          <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Documents professionnels</p>
            <p className="text-muted-foreground mt-1">
              Le <strong>PDF Banque</strong> est conçu pour être présenté à des professionnels (banquiers, experts-comptables). 
              Il inclut le Compte de résultat prévisionnel, le Bilan, le Plan de trésorerie mensuel, le Plan de financement et le BFR.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
