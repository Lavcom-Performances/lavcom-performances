import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  AlertCircle,
  WashingMachine,
  Wind,
  Download,
  Plus,
  Wrench,
  Calendar,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Settings,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Types
interface MaintenanceRecord {
  id: string;
  machineId: string;
  machineName: string;
  machineType: "LL" | "SL";
  date: string;
  type: "preventive" | "corrective" | "urgente";
  replacedParts: string[];
  laborCost: number;
  partsCost: number;
  duration: number; // minutes
  technician: string;
  notes: string;
}

interface MachineHealth {
  id: string;
  name: string;
  type: "LL" | "SL";
  status: "ok" | "warning" | "critical";
  healthScore: number;
  cyclesSinceMaintenance: number;
  maintenanceThreshold: number;
  lastMaintenance: string;
  predictedNextMaintenance: string;
  riskFactors: string[];
}

// Parts catalog
const partsCatalog = {
  LL: [
    { id: "courroie", name: "Courroie de transmission" },
    { id: "pompe", name: "Pompe de vidange" },
    { id: "moteur", name: "Moteur principal" },
    { id: "joint", name: "Joint de hublot" },
    { id: "roulement", name: "Roulement tambour" },
    { id: "electrovannes", name: "Électrovannes" },
    { id: "resistance", name: "Résistance" },
    { id: "carte", name: "Carte électronique" },
    { id: "tambour", name: "Tambour" },
    { id: "amortisseurs", name: "Amortisseurs" },
  ],
  SL: [
    { id: "courroie", name: "Courroie de transmission" },
    { id: "moteur", name: "Moteur ventilateur" },
    { id: "resistance", name: "Résistance de chauffe" },
    { id: "thermostat", name: "Thermostat" },
    { id: "tambour", name: "Tambour" },
    { id: "roulement", name: "Roulement tambour" },
    { id: "carte", name: "Carte électronique" },
    { id: "filtre", name: "Filtre à peluches" },
    { id: "galet", name: "Galet tendeur" },
    { id: "sonde", name: "Sonde de température" },
  ],
};

// Mock data
const mockMachineHealth: MachineHealth[] = [
  {
    id: "LL1",
    name: "Lave-linge 8kg #1",
    type: "LL",
    status: "critical",
    healthScore: 35,
    cyclesSinceMaintenance: 2850,
    maintenanceThreshold: 2000,
    lastMaintenance: "2024-03-15",
    predictedNextMaintenance: "2025-01-10",
    riskFactors: ["Cycles dépassés +42%", "Vibrations anormales détectées"],
  },
  {
    id: "LL2",
    name: "Lave-linge 8kg #2",
    type: "LL",
    status: "warning",
    healthScore: 62,
    cyclesSinceMaintenance: 1800,
    maintenanceThreshold: 2000,
    lastMaintenance: "2024-06-20",
    predictedNextMaintenance: "2025-02-15",
    riskFactors: ["Approche seuil maintenance"],
  },
  {
    id: "LL3",
    name: "Lave-linge 12kg #1",
    type: "LL",
    status: "ok",
    healthScore: 88,
    cyclesSinceMaintenance: 450,
    maintenanceThreshold: 2000,
    lastMaintenance: "2024-10-10",
    predictedNextMaintenance: "2025-06-01",
    riskFactors: [],
  },
  {
    id: "SL1",
    name: "Sèche-linge 18kg #1",
    type: "SL",
    status: "warning",
    healthScore: 55,
    cyclesSinceMaintenance: 1650,
    maintenanceThreshold: 1800,
    lastMaintenance: "2024-05-12",
    predictedNextMaintenance: "2025-01-20",
    riskFactors: ["Temps de séchage rallongé", "Filtre à vérifier"],
  },
  {
    id: "SL2",
    name: "Sèche-linge 18kg #2",
    type: "SL",
    status: "ok",
    healthScore: 92,
    cyclesSinceMaintenance: 320,
    maintenanceThreshold: 1800,
    lastMaintenance: "2024-11-01",
    predictedNextMaintenance: "2025-07-15",
    riskFactors: [],
  },
];

const mockMaintenanceHistory: MaintenanceRecord[] = [
  {
    id: "M1",
    machineId: "LL1",
    machineName: "Lave-linge 8kg #1",
    machineType: "LL",
    date: "2024-03-15",
    type: "preventive",
    replacedParts: ["Courroie de transmission", "Joint de hublot"],
    laborCost: 80,
    partsCost: 45,
    duration: 90,
    technician: "Martin D.",
    notes: "Remplacement préventif courroie usée. Joint présentant des micro-fissures.",
  },
  {
    id: "M2",
    machineId: "SL1",
    machineName: "Sèche-linge 18kg #1",
    machineType: "SL",
    date: "2024-05-12",
    type: "corrective",
    replacedParts: ["Résistance de chauffe"],
    laborCost: 100,
    partsCost: 85,
    duration: 120,
    technician: "Paul L.",
    notes: "Résistance défaillante causant un séchage insuffisant.",
  },
  {
    id: "M3",
    machineId: "LL2",
    machineName: "Lave-linge 8kg #2",
    machineType: "LL",
    date: "2024-06-20",
    type: "preventive",
    replacedParts: ["Pompe de vidange", "Électrovannes"],
    laborCost: 90,
    partsCost: 120,
    duration: 150,
    technician: "Martin D.",
    notes: "Maintenance préventive complète.",
  },
  {
    id: "M4",
    machineId: "LL3",
    machineName: "Lave-linge 12kg #1",
    machineType: "LL",
    date: "2024-10-10",
    type: "urgente",
    replacedParts: ["Roulement tambour", "Amortisseurs"],
    laborCost: 150,
    partsCost: 180,
    duration: 240,
    technician: "Paul L.",
    notes: "Panne soudaine - bruits forts. Roulements grippés.",
  },
  {
    id: "M5",
    machineId: "SL2",
    machineName: "Sèche-linge 18kg #2",
    machineType: "SL",
    date: "2024-11-01",
    type: "preventive",
    replacedParts: ["Galet tendeur", "Filtre à peluches"],
    laborCost: 60,
    partsCost: 35,
    duration: 60,
    technician: "Martin D.",
    notes: "Maintenance de routine.",
  },
];

// Evolution data for charts
const healthEvolutionData = [
  { month: "Jan", LL1: 85, LL2: 90, LL3: 95, SL1: 88, SL2: 92 },
  { month: "Fév", LL1: 82, LL2: 87, LL3: 93, SL1: 85, SL2: 90 },
  { month: "Mar", LL1: 78, LL2: 84, LL3: 91, SL1: 80, SL2: 88 },
  { month: "Avr", LL1: 72, LL2: 80, LL3: 88, SL1: 75, SL2: 95 },
  { month: "Mai", LL1: 65, LL2: 76, LL3: 86, SL1: 70, SL2: 93 },
  { month: "Juin", LL1: 58, LL2: 85, LL3: 84, SL1: 65, SL2: 91 },
  { month: "Juil", LL1: 52, LL2: 82, LL3: 82, SL1: 62, SL2: 89 },
  { month: "Août", LL1: 48, LL2: 78, LL3: 80, SL1: 60, SL2: 94 },
  { month: "Sep", LL1: 44, LL2: 74, LL3: 85, SL1: 58, SL2: 93 },
  { month: "Oct", LL1: 40, LL2: 70, LL3: 92, SL1: 56, SL2: 92 },
  { month: "Nov", LL1: 37, LL2: 66, LL3: 90, SL1: 55, SL2: 95 },
  { month: "Déc", LL1: 35, LL2: 62, LL3: 88, SL1: 55, SL2: 92 },
];

const maintenanceCostData = [
  { month: "Jan", preventive: 0, corrective: 0, urgente: 0 },
  { month: "Fév", preventive: 0, corrective: 0, urgente: 0 },
  { month: "Mar", preventive: 125, corrective: 0, urgente: 0 },
  { month: "Avr", preventive: 0, corrective: 0, urgente: 0 },
  { month: "Mai", preventive: 0, corrective: 185, urgente: 0 },
  { month: "Juin", preventive: 210, corrective: 0, urgente: 0 },
  { month: "Juil", preventive: 0, corrective: 0, urgente: 0 },
  { month: "Août", preventive: 0, corrective: 0, urgente: 0 },
  { month: "Sep", preventive: 0, corrective: 0, urgente: 0 },
  { month: "Oct", preventive: 0, corrective: 0, urgente: 330 },
  { month: "Nov", preventive: 95, corrective: 0, urgente: 0 },
  { month: "Déc", preventive: 0, corrective: 0, urgente: 0 },
];

const chartConfig = {
  LL1: { label: "LL 8kg #1", color: "hsl(var(--destructive))" },
  LL2: { label: "LL 8kg #2", color: "hsl(var(--warning))" },
  LL3: { label: "LL 12kg #1", color: "hsl(var(--success))" },
  SL1: { label: "SL 18kg #1", color: "hsl(var(--warning))" },
  SL2: { label: "SL 18kg #2", color: "hsl(var(--success))" },
  preventive: { label: "Préventive", color: "hsl(var(--success))" },
  corrective: { label: "Corrective", color: "hsl(var(--warning))" },
  urgente: { label: "Urgente", color: "hsl(var(--destructive))" },
};

export default function PredictiveMaintenance() {
  const [machines] = useState<MachineHealth[]>(mockMachineHealth);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>(mockMaintenanceHistory);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [newRecord, setNewRecord] = useState<Partial<MaintenanceRecord>>({
    type: "preventive",
    replacedParts: [],
    laborCost: 0,
    partsCost: 0,
    duration: 60,
    technician: "",
    notes: "",
  });

  const criticalCount = machines.filter((m) => m.status === "critical").length;
  const warningCount = machines.filter((m) => m.status === "warning").length;
  const okCount = machines.filter((m) => m.status === "ok").length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "critical":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-lime-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical":
        return <Badge variant="destructive">Critique</Badge>;
      case "warning":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Attention</Badge>;
      default:
        return <Badge className="bg-lime-100 text-lime-700 hover:bg-lime-100">OK</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "urgente":
        return <Badge variant="destructive">Urgente</Badge>;
      case "corrective":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Corrective</Badge>;
      default:
        return <Badge className="bg-lime-100 text-lime-700 hover:bg-lime-100">Préventive</Badge>;
    }
  };

  const handleAddMaintenance = () => {
    if (!selectedMachine) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une machine", variant: "destructive" });
      return;
    }

    const machine = machines.find((m) => m.id === selectedMachine);
    if (!machine) return;

    const record: MaintenanceRecord = {
      id: `M${maintenanceHistory.length + 1}`,
      machineId: selectedMachine,
      machineName: machine.name,
      machineType: machine.type,
      date: new Date().toISOString().split("T")[0],
      type: newRecord.type as "preventive" | "corrective" | "urgente",
      replacedParts: newRecord.replacedParts || [],
      laborCost: newRecord.laborCost || 0,
      partsCost: newRecord.partsCost || 0,
      duration: newRecord.duration || 60,
      technician: newRecord.technician || "",
      notes: newRecord.notes || "",
    };

    setMaintenanceHistory([record, ...maintenanceHistory]);
    setDialogOpen(false);
    setSelectedMachine("");
    setNewRecord({
      type: "preventive",
      replacedParts: [],
      laborCost: 0,
      partsCost: 0,
      duration: 60,
      technician: "",
      notes: "",
    });

    toast({ title: "Succès", description: "Intervention enregistrée" });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("Rapport de Maintenance Prédictive", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, pageWidth / 2, 32, { align: "center" });

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Summary section
    let yPos = 55;
    doc.setFontSize(16);
    doc.text("Résumé de l'état du parc", 14, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.text(`• Machines critiques: ${criticalCount}`, 20, yPos);
    yPos += 7;
    doc.text(`• Machines en attention: ${warningCount}`, 20, yPos);
    yPos += 7;
    doc.text(`• Machines OK: ${okCount}`, 20, yPos);
    yPos += 15;

    // Machine health table
    doc.setFontSize(16);
    doc.text("État de santé des machines", 14, yPos);
    yPos += 5;

    const machineRows = machines.map((m) => [
      m.name,
      m.type === "LL" ? "Lave-linge" : "Sèche-linge",
      `${m.healthScore}%`,
      m.status === "critical" ? "CRITIQUE" : m.status === "warning" ? "ATTENTION" : "OK",
      `${m.cyclesSinceMaintenance} / ${m.maintenanceThreshold}`,
      m.predictedNextMaintenance,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Machine", "Type", "Santé", "Statut", "Cycles", "Proch. maintenance"]],
      body: machineRows,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 15;

    // Risk factors
    doc.setFontSize(16);
    doc.text("Facteurs de risque identifiés", 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    machines
      .filter((m) => m.riskFactors.length > 0)
      .forEach((m) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${m.name}:`, 20, yPos);
        doc.setFont("helvetica", "normal");
        yPos += 6;
        m.riskFactors.forEach((risk) => {
          doc.text(`  - ${risk}`, 25, yPos);
          yPos += 5;
        });
        yPos += 3;
      });

    // New page for maintenance history
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.text("Historique des interventions", 14, yPos);
    yPos += 5;

    const historyRows = maintenanceHistory.map((r) => [
      r.date,
      r.machineName,
      r.type.charAt(0).toUpperCase() + r.type.slice(1),
      r.replacedParts.join(", ") || "-",
      `${r.laborCost + r.partsCost} €`,
      r.technician,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Machine", "Type", "Pièces remplacées", "Coût total", "Technicien"]],
      body: historyRows,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { cellWidth: 50 },
      },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 15;

    // Cost analysis
    doc.setFontSize(16);
    doc.text("Analyse des coûts", 14, yPos);
    yPos += 10;

    const totalPreventive = maintenanceHistory
      .filter((r) => r.type === "preventive")
      .reduce((sum, r) => sum + r.laborCost + r.partsCost, 0);
    const totalCorrective = maintenanceHistory
      .filter((r) => r.type === "corrective")
      .reduce((sum, r) => sum + r.laborCost + r.partsCost, 0);
    const totalUrgente = maintenanceHistory
      .filter((r) => r.type === "urgente")
      .reduce((sum, r) => sum + r.laborCost + r.partsCost, 0);

    doc.setFontSize(11);
    doc.text(`• Maintenance préventive: ${totalPreventive} €`, 20, yPos);
    yPos += 7;
    doc.text(`• Maintenance corrective: ${totalCorrective} €`, 20, yPos);
    yPos += 7;
    doc.text(`• Maintenance urgente: ${totalUrgente} €`, 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text(`• TOTAL: ${totalPreventive + totalCorrective + totalUrgente} €`, 20, yPos);

    // Recommendations
    yPos += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.text("Recommandations", 14, yPos);
    yPos += 10;

    doc.setFontSize(10);
    const recommendations = [
      "Planifier une intervention urgente sur le Lave-linge 8kg #1 (santé critique à 35%)",
      "Surveiller le Sèche-linge 18kg #1 - temps de séchage rallongé signalé",
      "Anticiper la maintenance du Lave-linge 8kg #2 avant d'atteindre le seuil critique",
      "Maintenir le programme de maintenance préventive pour réduire les pannes urgentes",
    ];

    recommendations.forEach((rec, i) => {
      doc.text(`${i + 1}. ${rec}`, 20, yPos);
      yPos += 7;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }

    doc.save(`rapport-maintenance-${new Date().toISOString().split("T")[0]}.pdf`);
    toast({ title: "Succès", description: "Rapport PDF téléchargé" });
  };

  const selectedMachineType = machines.find((m) => m.id === selectedMachine)?.type;
  const availableParts = selectedMachineType ? partsCatalog[selectedMachineType] : [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance Prédictive</h1>
          <p className="text-muted-foreground">Suivi et prévision de l'état de santé des machines</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle intervention
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Enregistrer une intervention</DialogTitle>
                <DialogDescription>
                  Renseignez les détails de l'intervention de maintenance
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Machine *</Label>
                  <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Type d'intervention *</Label>
                    <Select
                      value={newRecord.type}
                      onValueChange={(v) => setNewRecord({ ...newRecord, type: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preventive">Préventive</SelectItem>
                        <SelectItem value="corrective">Corrective</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Technicien</Label>
                    <Input
                      value={newRecord.technician}
                      onChange={(e) => setNewRecord({ ...newRecord, technician: e.target.value })}
                      placeholder="Nom du technicien"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Pièces remplacées</Label>
                  <Select
                    value=""
                    onValueChange={(v) => {
                      const parts = newRecord.replacedParts || [];
                      if (!parts.includes(v)) {
                        setNewRecord({ ...newRecord, replacedParts: [...parts, v] });
                      }
                    }}
                    disabled={!selectedMachine}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedMachine ? "Ajouter une pièce" : "Sélectionnez d'abord une machine"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableParts.map((part) => (
                        <SelectItem key={part.id} value={part.name}>
                          {part.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(newRecord.replacedParts || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newRecord.replacedParts?.map((part) => (
                        <Badge
                          key={part}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() =>
                            setNewRecord({
                              ...newRecord,
                              replacedParts: newRecord.replacedParts?.filter((p) => p !== part),
                            })
                          }
                        >
                          {part} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Coût main-d'œuvre (€)</Label>
                    <Input
                      type="number"
                      value={newRecord.laborCost}
                      onChange={(e) => setNewRecord({ ...newRecord, laborCost: Number(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Coût pièces (€)</Label>
                    <Input
                      type="number"
                      value={newRecord.partsCost}
                      onChange={(e) => setNewRecord({ ...newRecord, partsCost: Number(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Durée (min)</Label>
                    <Input
                      type="number"
                      value={newRecord.duration}
                      onChange={(e) => setNewRecord({ ...newRecord, duration: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newRecord.notes}
                    onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                    placeholder="Observations, détails de l'intervention..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddMaintenance}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={generatePDF}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger rapport
          </Button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn("border-l-4", criticalCount > 0 ? "border-l-destructive" : "border-l-muted")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{criticalCount}</p>
              <p className="text-sm text-muted-foreground">Machines critiques</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4", warningCount > 0 ? "border-l-amber-500" : "border-l-muted")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{warningCount}</p>
              <p className="text-sm text-muted-foreground">Machines en attention</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-lime-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-lime-100">
              <CheckCircle className="h-6 w-6 text-lime-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{okCount}</p>
              <p className="text-sm text-muted-foreground">Machines OK</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="analysis">Analyse</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Health Evolution Chart */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Évolution de la santé des machines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart data={healthEvolutionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="LL1" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="LL2" stroke="hsl(346 77% 50%)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="LL3" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="SL1" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="SL2" stroke="hsl(142 76% 46%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Maintenance Costs Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Coûts de maintenance par mois
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={maintenanceCostData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="preventive" name="Préventive" fill="hsl(142 76% 36%)" stackId="a" />
                    <Bar dataKey="corrective" name="Corrective" fill="hsl(38 92% 50%)" stackId="a" />
                    <Bar dataKey="urgente" name="Urgente" fill="hsl(var(--destructive))" stackId="a" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Machine Health Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  État actuel des machines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {machines.map((machine) => (
                  <div
                    key={machine.id}
                    className={cn(
                      "p-3 rounded-lg border flex items-center gap-3",
                      machine.status === "critical" && "bg-destructive/5 border-destructive/30",
                      machine.status === "warning" && "bg-amber-50 border-amber-200",
                      machine.status === "ok" && "bg-lime-50 border-lime-200"
                    )}
                  >
                    <div className="p-2 rounded-full bg-background">
                      {machine.type === "LL" ? (
                        <WashingMachine className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Wind className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{machine.name}</span>
                        {getStatusBadge(machine.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={machine.healthScore}
                          className={cn(
                            "h-2 flex-1",
                            machine.status === "critical" && "[&>div]:bg-destructive",
                            machine.status === "warning" && "[&>div]:bg-amber-500",
                            machine.status === "ok" && "[&>div]:bg-lime-500"
                          )}
                        />
                        <span className="text-xs font-medium w-10 text-right">{machine.healthScore}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Detailed Analysis */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Analyse prédictive détaillée
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Machine</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Santé</TableHead>
                      <TableHead>Cycles</TableHead>
                      <TableHead>Dernière maintenance</TableHead>
                      <TableHead>Prochaine (prévue)</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machines.map((machine) => (
                      <TableRow key={machine.id}>
                        <TableCell className="font-medium">{machine.name}</TableCell>
                        <TableCell>
                          {machine.type === "LL" ? (
                            <div className="flex items-center gap-2">
                              <WashingMachine className="h-4 w-4" />
                              Lave-linge
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Wind className="h-4 w-4" />
                              Sèche-linge
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={machine.healthScore}
                              className={cn(
                                "h-2 w-16",
                                machine.status === "critical" && "[&>div]:bg-destructive",
                                machine.status === "warning" && "[&>div]:bg-amber-500",
                                machine.status === "ok" && "[&>div]:bg-lime-500"
                              )}
                            />
                            <span className="text-sm">{machine.healthScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-medium",
                              machine.cyclesSinceMaintenance > machine.maintenanceThreshold && "text-destructive"
                            )}
                          >
                            {machine.cyclesSinceMaintenance}
                          </span>
                          <span className="text-muted-foreground"> / {machine.maintenanceThreshold}</span>
                        </TableCell>
                        <TableCell>{new Date(machine.lastMaintenance).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell>{new Date(machine.predictedNextMaintenance).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell>{getStatusBadge(machine.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Risk Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Facteurs de risque identifiés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {machines
                  .filter((m) => m.riskFactors.length > 0)
                  .map((machine) => (
                    <div key={machine.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(machine.status)}
                        <span className="font-medium">{machine.name}</span>
                      </div>
                      <ul className="pl-7 space-y-1">
                        {machine.riskFactors.map((risk, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            • {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                {machines.filter((m) => m.riskFactors.length > 0).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">Aucun facteur de risque identifié</p>
                )}
              </CardContent>
            </Card>

            {/* Cost Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Analyse des coûts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-lime-50 border border-lime-200">
                    <p className="text-lg font-bold text-lime-700">
                      {maintenanceHistory
                        .filter((r) => r.type === "preventive")
                        .reduce((sum, r) => sum + r.laborCost + r.partsCost, 0)}{" "}
                      €
                    </p>
                    <p className="text-xs text-lime-600">Préventive</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-lg font-bold text-amber-700">
                      {maintenanceHistory
                        .filter((r) => r.type === "corrective")
                        .reduce((sum, r) => sum + r.laborCost + r.partsCost, 0)}{" "}
                      €
                    </p>
                    <p className="text-xs text-amber-600">Corrective</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-lg font-bold text-destructive">
                      {maintenanceHistory
                        .filter((r) => r.type === "urgente")
                        .reduce((sum, r) => sum + r.laborCost + r.partsCost, 0)}{" "}
                      €
                    </p>
                    <p className="text-xs text-red-600">Urgente</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">
                    {maintenanceHistory.reduce((sum, r) => sum + r.laborCost + r.partsCost, 0)} €
                  </p>
                  <p className="text-sm text-muted-foreground">Coût total maintenance (12 mois)</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-lime-500" />
                    La maintenance préventive représente{" "}
                    {Math.round(
                      (maintenanceHistory
                        .filter((r) => r.type === "preventive")
                        .reduce((sum, r) => sum + r.laborCost + r.partsCost, 0) /
                        maintenanceHistory.reduce((sum, r) => sum + r.laborCost + r.partsCost, 0)) *
                        100
                    )}
                    % du budget
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Critical Alerts */}
            {machines.filter((m) => m.status === "critical").length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader className="bg-destructive/5">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    Alertes critiques - Intervention urgente requise
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {machines
                    .filter((m) => m.status === "critical")
                    .map((machine) => (
                      <div key={machine.id} className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-destructive/10">
                            {machine.type === "LL" ? (
                              <WashingMachine className="h-5 w-5 text-destructive" />
                            ) : (
                              <Wind className="h-5 w-5 text-destructive" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{machine.name}</h4>
                            <p className="text-sm text-destructive">Score santé: {machine.healthScore}%</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Cycles: {machine.cyclesSinceMaintenance} / {machine.maintenanceThreshold} (
                              {Math.round((machine.cyclesSinceMaintenance / machine.maintenanceThreshold) * 100 - 100)}%
                              au-dessus du seuil)
                            </p>
                            {machine.riskFactors.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-muted-foreground">Risques identifiés:</p>
                                <ul className="text-sm text-destructive">
                                  {machine.riskFactors.map((risk, i) => (
                                    <li key={i}>• {risk}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="destructive">
                            Planifier intervention
                          </Button>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Warning Alerts */}
            {machines.filter((m) => m.status === "warning").length > 0 && (
              <Card className="border-amber-300">
                <CardHeader className="bg-amber-50">
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-5 w-5" />
                    Alertes de surveillance - Maintenance à planifier
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {machines
                    .filter((m) => m.status === "warning")
                    .map((machine) => (
                      <div key={machine.id} className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-amber-100">
                            {machine.type === "LL" ? (
                              <WashingMachine className="h-5 w-5 text-amber-600" />
                            ) : (
                              <Wind className="h-5 w-5 text-amber-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{machine.name}</h4>
                            <p className="text-sm text-amber-700">Score santé: {machine.healthScore}%</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Cycles: {machine.cyclesSinceMaintenance} / {machine.maintenanceThreshold} (
                              {Math.round((machine.cyclesSinceMaintenance / machine.maintenanceThreshold) * 100)}%)
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Maintenance prévue: {new Date(machine.predictedNextMaintenance).toLocaleDateString("fr-FR")}
                            </p>
                            {machine.riskFactors.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-muted-foreground">Risques identifiés:</p>
                                <ul className="text-sm text-amber-700">
                                  {machine.riskFactors.map((risk, i) => (
                                    <li key={i}>• {risk}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                            Planifier
                          </Button>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* OK Status */}
            <Card className="border-lime-300">
              <CardHeader className="bg-lime-50">
                <CardTitle className="flex items-center gap-2 text-lime-700">
                  <CheckCircle className="h-5 w-5" />
                  Machines en bon état
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {machines
                    .filter((m) => m.status === "ok")
                    .map((machine) => (
                      <div key={machine.id} className="p-3 rounded-lg bg-lime-50 border border-lime-200 flex items-center gap-3">
                        <div className="p-2 rounded-full bg-lime-100">
                          {machine.type === "LL" ? (
                            <WashingMachine className="h-4 w-4 text-lime-600" />
                          ) : (
                            <Wind className="h-4 w-4 text-lime-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{machine.name}</p>
                          <p className="text-xs text-lime-600">Santé: {machine.healthScore}%</p>
                        </div>
                        <Badge className="bg-lime-100 text-lime-700 hover:bg-lime-100">OK</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Historique des interventions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pièces remplacées</TableHead>
                    <TableHead>Coût</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Technicien</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.machineType === "LL" ? (
                            <WashingMachine className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Wind className="h-4 w-4 text-muted-foreground" />
                          )}
                          {record.machineName}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(record.type)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {record.replacedParts.length > 0 ? (
                            record.replacedParts.map((part, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {part}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{record.laborCost + record.partsCost} €</p>
                          <p className="text-xs text-muted-foreground">
                            MO: {record.laborCost}€ | Pièces: {record.partsCost}€
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{record.duration} min</TableCell>
                      <TableCell>{record.technician}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
