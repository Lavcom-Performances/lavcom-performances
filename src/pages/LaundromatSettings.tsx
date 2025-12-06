import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { 
  Building2, 
  Clock, 
  WashingMachine, 
  Wind, 
  Save, 
  Plus, 
  Trash2, 
  Euro, 
  Target, 
  Ruler, 
  Calendar,
  User,
  Wrench,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Machine {
  id: string;
  name: string;
  type: "LL" | "SL";
  capacity: number;
  cycleDuration: number;
  pricePerCycle: number;
  maintenanceThreshold: number; // cycles avant maintenance
  cyclesSinceLastMaintenance: number;
  lastMaintenanceDate: string;
}

interface LaundryInfo {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  responsibleName: string;
  openingDate: string;
  surface: number;
  notes: string;
}

interface OperatingHours {
  opening: string;
  closing: string;
}

interface Objectives {
  monthlyRevenue: number;
  annualRevenue: number;
  targetOccupancyRate: number;
  targetBasket: number;
}

export default function LaundromatSettings() {
  // Laundromat info
  const [laundryInfo, setLaundryInfo] = useState<LaundryInfo>({
    name: "Laverie Centre-Ville",
    address: "123 Rue de la Laverie",
    city: "Paris",
    postalCode: "75001",
    phone: "01 23 45 67 89",
    email: "contact@laverie-centre.fr",
    responsibleName: "Jean Dupont",
    openingDate: "2020-03-15",
    surface: 45,
    notes: "",
  });

  // Operating hours
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    opening: "07:00",
    closing: "22:00",
  });

  // Objectives
  const [objectives, setObjectives] = useState<Objectives>({
    monthlyRevenue: 4500,
    annualRevenue: 54000,
    targetOccupancyRate: 70,
    targetBasket: 8,
  });

  // Machines
  const [machines, setMachines] = useState<Machine[]>([
    { id: "LL1", name: "Lave-linge 1", type: "LL", capacity: 8, cycleDuration: 40, pricePerCycle: 4.5, maintenanceThreshold: 500, cyclesSinceLastMaintenance: 234, lastMaintenanceDate: "2024-09-15" },
    { id: "LL2", name: "Lave-linge 2", type: "LL", capacity: 8, cycleDuration: 40, pricePerCycle: 4.5, maintenanceThreshold: 500, cyclesSinceLastMaintenance: 189, lastMaintenanceDate: "2024-10-01" },
    { id: "LL3", name: "Lave-linge 3", type: "LL", capacity: 12, cycleDuration: 45, pricePerCycle: 6, maintenanceThreshold: 500, cyclesSinceLastMaintenance: 456, lastMaintenanceDate: "2024-08-20" },
    { id: "LL4", name: "Lave-linge 4", type: "LL", capacity: 18, cycleDuration: 50, pricePerCycle: 8, maintenanceThreshold: 500, cyclesSinceLastMaintenance: 123, lastMaintenanceDate: "2024-11-01" },
    { id: "SL1", name: "Sèche-linge 1", type: "SL", capacity: 14, cycleDuration: 8, pricePerCycle: 1, maintenanceThreshold: 600, cyclesSinceLastMaintenance: 345, lastMaintenanceDate: "2024-09-01" },
    { id: "SL2", name: "Sèche-linge 2", type: "SL", capacity: 14, cycleDuration: 8, pricePerCycle: 1, maintenanceThreshold: 600, cyclesSinceLastMaintenance: 298, lastMaintenanceDate: "2024-09-15" },
    { id: "SL3", name: "Sèche-linge 3", type: "SL", capacity: 14, cycleDuration: 8, pricePerCycle: 1, maintenanceThreshold: 600, cyclesSinceLastMaintenance: 512, lastMaintenanceDate: "2024-08-01" },
  ]);

  // Calculate operating hours
  const calculateOperatingHoursValue = (open: string, close: string) => {
    const [openH, openM] = open.split(":").map(Number);
    const [closeH, closeM] = close.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    return Math.round((closeMinutes - openMinutes) / 60 * 10) / 10;
  };

  const operatingHoursValue = calculateOperatingHoursValue(operatingHours.opening, operatingHours.closing);
  const operatingMinutes = operatingHoursValue * 60;

  // Machine management
  const addMachine = (type: "LL" | "SL") => {
    const typeLabel = type === "LL" ? "Lave-linge" : "Sèche-linge";
    const count = machines.filter(m => m.type === type).length + 1;
    const newMachine: Machine = {
      id: `${type}${Date.now()}`,
      name: `${typeLabel} ${count}`,
      type,
      capacity: type === "LL" ? 8 : 14,
      cycleDuration: type === "LL" ? 40 : 8,
      pricePerCycle: type === "LL" ? 4.5 : 1,
      maintenanceThreshold: type === "LL" ? 500 : 600,
      cyclesSinceLastMaintenance: 0,
      lastMaintenanceDate: new Date().toISOString().split('T')[0],
    };
    setMachines([...machines, newMachine]);
  };

  const removeMachine = (id: string) => {
    setMachines(machines.filter(m => m.id !== id));
  };

  const updateMachine = (id: string, field: keyof Machine, value: string | number) => {
    setMachines(machines.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleSave = () => {
    toast.success("Paramètres enregistrés avec succès");
  };

  // Calculations
  const washingMachines = machines.filter(m => m.type === "LL");
  const dryerMachines = machines.filter(m => m.type === "SL");

  const avgWashingCycle = washingMachines.length > 0 
    ? Math.round(washingMachines.reduce((sum, m) => sum + m.cycleDuration, 0) / washingMachines.length)
    : 40;
  const avgDryerCycle = dryerMachines.length > 0
    ? Math.round(dryerMachines.reduce((sum, m) => sum + m.cycleDuration, 0) / dryerMachines.length)
    : 8;

  const optimalWashingCyclesPerDay = Math.floor(operatingMinutes / avgWashingCycle);
  const optimalDryerCyclesPerDay = Math.floor(operatingMinutes / avgDryerCycle);

  const avgWashingPrice = washingMachines.length > 0
    ? washingMachines.reduce((sum, m) => sum + m.pricePerCycle, 0) / washingMachines.length
    : 5;
  const avgDryerPrice = dryerMachines.length > 0
    ? dryerMachines.reduce((sum, m) => sum + m.pricePerCycle, 0) / dryerMachines.length
    : 1;

  const theoreticalDailyRevenue = 
    (optimalWashingCyclesPerDay * washingMachines.length * avgWashingPrice * (objectives.targetOccupancyRate / 100)) +
    (optimalDryerCyclesPerDay * dryerMachines.length * avgDryerPrice * (objectives.targetOccupancyRate / 100));

  const machinesNeedingMaintenance = machines.filter(
    m => m.cyclesSinceLastMaintenance >= m.maintenanceThreshold * 0.8
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Paramètres de la laverie
          </h1>
          <p className="text-muted-foreground mt-1">
            Configuration complète pour le calcul des KPIs
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </div>

      {/* Maintenance Alert */}
      {machinesNeedingMaintenance.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Maintenance recommandée</p>
                <p className="text-sm text-amber-700">
                  {machinesNeedingMaintenance.length} machine(s) approchent du seuil de maintenance : {machinesNeedingMaintenance.map(m => m.name).join(", ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="objectives">Objectifs</TabsTrigger>
          <TabsTrigger value="summary">Récapitulatif</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Identité de la laverie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de la laverie</Label>
                  <Input
                    id="name"
                    value={laundryInfo.name}
                    onChange={(e) => setLaundryInfo({ ...laundryInfo, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={laundryInfo.address}
                    onChange={(e) => setLaundryInfo({ ...laundryInfo, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={laundryInfo.city}
                      onChange={(e) => setLaundryInfo({ ...laundryInfo, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Code postal</Label>
                    <Input
                      id="postalCode"
                      value={laundryInfo.postalCode}
                      onChange={(e) => setLaundryInfo({ ...laundryInfo, postalCode: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={laundryInfo.phone}
                      onChange={(e) => setLaundryInfo({ ...laundryInfo, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={laundryInfo.email}
                      onChange={(e) => setLaundryInfo({ ...laundryInfo, email: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Physical Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="h-5 w-5" />
                  Informations physiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="surface">Surface (m²)</Label>
                  <Input
                    id="surface"
                    type="number"
                    value={laundryInfo.surface}
                    onChange={(e) => setLaundryInfo({ ...laundryInfo, surface: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Utilisé pour calculer le CA/m²
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openingDate">Date d'ouverture</Label>
                  <Input
                    id="openingDate"
                    type="date"
                    value={laundryInfo.openingDate}
                    onChange={(e) => setLaundryInfo({ ...laundryInfo, openingDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsible">Responsable</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="responsible"
                      value={laundryInfo.responsibleName}
                      onChange={(e) => setLaundryInfo({ ...laundryInfo, responsibleName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={laundryInfo.notes}
                    onChange={(e) => setLaundryInfo({ ...laundryInfo, notes: e.target.value })}
                    placeholder="Informations complémentaires..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Operating Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horaires d'ouverture
              </CardTitle>
              <CardDescription>
                Utilisés pour le calcul du taux d'occupation et du CA/heure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="opening">Ouverture</Label>
                  <Input
                    id="opening"
                    type="time"
                    value={operatingHours.opening}
                    onChange={(e) => setOperatingHours({ ...operatingHours, opening: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing">Fermeture</Label>
                  <Input
                    id="closing"
                    type="time"
                    value={operatingHours.closing}
                    onChange={(e) => setOperatingHours({ ...operatingHours, closing: e.target.value })}
                  />
                </div>
                <div className="p-4 bg-muted/50 rounded-lg flex flex-col justify-center">
                  <p className="text-sm font-medium">
                    Plage horaire : <span className="text-primary font-bold">{operatingHoursValue}h</span> par jour
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {operatingMinutes} minutes | {operatingHoursValue * 30}h/mois
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Machines Tab */}
        <TabsContent value="machines" className="space-y-6">
          {/* Machine Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50/50 border-blue-100">
              <CardContent className="p-4 text-center">
                <WashingMachine className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold text-blue-700">{washingMachines.length}</p>
                <p className="text-sm text-blue-600">Lave-linges</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Prix moy. {avgWashingPrice.toFixed(2)}€
                </p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50/50 border-orange-100">
              <CardContent className="p-4 text-center">
                <Wind className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <p className="text-2xl font-bold text-orange-700">{dryerMachines.length}</p>
                <p className="text-sm text-orange-600">Sèche-linges</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Prix moy. {avgDryerPrice.toFixed(2)}€
                </p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 text-center">
                <Wrench className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-primary">{machines.length}</p>
                <p className="text-sm text-muted-foreground">Total machines</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {machinesNeedingMaintenance.length} maintenance(s) requise(s)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Machines Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <WashingMachine className="h-5 w-5" />
                    Parc machines
                  </CardTitle>
                  <CardDescription>
                    Configurez les caractéristiques et tarifs de chaque machine
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addMachine("LL")} className="gap-1">
                    <Plus className="h-4 w-4" />
                    Lave-linge
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addMachine("SL")} className="gap-1">
                    <Plus className="h-4 w-4" />
                    Sèche-linge
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[100px]">Capacité (kg)</TableHead>
                      <TableHead className="w-[120px]">Durée (min)</TableHead>
                      <TableHead className="w-[100px]">Prix (€)</TableHead>
                      <TableHead className="w-[120px]">Seuil maint.</TableHead>
                      <TableHead className="w-[140px]">Cycles depuis</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machines.map((machine) => {
                      const maintenanceWarning = machine.cyclesSinceLastMaintenance >= machine.maintenanceThreshold * 0.8;
                      const maintenanceCritical = machine.cyclesSinceLastMaintenance >= machine.maintenanceThreshold;
                      return (
                        <TableRow key={machine.id} className={maintenanceCritical ? "bg-red-50" : maintenanceWarning ? "bg-amber-50" : ""}>
                          <TableCell>
                            <Input
                              value={machine.name}
                              onChange={(e) => updateMachine(machine.id, "name", e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              machine.type === "LL" 
                                ? "bg-blue-100 text-blue-700" 
                                : "bg-orange-100 text-orange-700"
                            }`}>
                              {machine.type === "LL" ? "LL" : "SL"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={machine.capacity}
                              onChange={(e) => updateMachine(machine.id, "capacity", parseInt(e.target.value) || 0)}
                              className="h-8 w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={machine.cycleDuration}
                              onChange={(e) => updateMachine(machine.id, "cycleDuration", parseInt(e.target.value) || 0)}
                              className="h-8 w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.5"
                              value={machine.pricePerCycle}
                              onChange={(e) => updateMachine(machine.id, "pricePerCycle", parseFloat(e.target.value) || 0)}
                              className="h-8 w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={machine.maintenanceThreshold}
                              onChange={(e) => updateMachine(machine.id, "maintenanceThreshold", parseInt(e.target.value) || 0)}
                              className="h-8 w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={machine.cyclesSinceLastMaintenance}
                                onChange={(e) => updateMachine(machine.id, "cyclesSinceLastMaintenance", parseInt(e.target.value) || 0)}
                                className={`h-8 w-16 ${maintenanceCritical ? "border-red-300" : maintenanceWarning ? "border-amber-300" : ""}`}
                              />
                              {maintenanceCritical && <AlertTriangle className="h-4 w-4 text-red-500" />}
                              {!maintenanceCritical && maintenanceWarning && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMachine(machine.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Objectives Tab */}
        <TabsContent value="objectives" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Objectifs de chiffre d'affaires
                </CardTitle>
                <CardDescription>
                  Définissez vos objectifs pour le suivi de performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyTarget">Objectif CA mensuel (€)</Label>
                  <Input
                    id="monthlyTarget"
                    type="number"
                    value={objectives.monthlyRevenue}
                    onChange={(e) => setObjectives({ ...objectives, monthlyRevenue: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualTarget">Objectif CA annuel (€)</Label>
                  <Input
                    id="annualTarget"
                    type="number"
                    value={objectives.annualRevenue}
                    onChange={(e) => setObjectives({ ...objectives, annualRevenue: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Objectif mensuel moyen : {(objectives.annualRevenue / 12).toLocaleString('fr-FR')} €
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Objectifs opérationnels
                </CardTitle>
                <CardDescription>
                  Cibles pour le taux d'occupation et le panier moyen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="occupancyTarget">Taux d'occupation cible (%)</Label>
                  <Input
                    id="occupancyTarget"
                    type="number"
                    min="0"
                    max="100"
                    value={objectives.targetOccupancyRate}
                    onChange={(e) => setObjectives({ ...objectives, targetOccupancyRate: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommandé : 65-75% pour une laverie bien optimisée
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basketTarget">Panier moyen cible (€)</Label>
                  <Input
                    id="basketTarget"
                    type="number"
                    step="0.5"
                    value={objectives.targetBasket}
                    onChange={(e) => setObjectives({ ...objectives, targetBasket: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          {/* Identity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Récapitulatif de la laverie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Nom</p>
                  <p className="font-semibold">{laundryInfo.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-semibold">{laundryInfo.address}, {laundryInfo.postalCode} {laundryInfo.city}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Surface</p>
                  <p className="font-semibold">{laundryInfo.surface} m²</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Responsable</p>
                  <p className="font-semibold">{laundryInfo.responsibleName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capacity Summary */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Capacité théorique calculée
              </CardTitle>
              <CardDescription>
                Basée sur les horaires, machines et taux d'occupation cible ({objectives.targetOccupancyRate}%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-background rounded-lg">
                  <WashingMachine className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-muted-foreground">Cycles LL/jour</p>
                  <p className="text-2xl font-bold text-blue-600">{optimalWashingCyclesPerDay * washingMachines.length}</p>
                  <p className="text-xs text-muted-foreground">{optimalWashingCyclesPerDay}/machine</p>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <Wind className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-sm text-muted-foreground">Cycles SL/jour</p>
                  <p className="text-2xl font-bold text-orange-600">{optimalDryerCyclesPerDay * dryerMachines.length}</p>
                  <p className="text-xs text-muted-foreground">{optimalDryerCyclesPerDay}/machine</p>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <Euro className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">CA/jour estimé</p>
                  <p className="text-2xl font-bold text-primary">{theoreticalDailyRevenue.toFixed(0)} €</p>
                  <p className="text-xs text-muted-foreground">à {objectives.targetOccupancyRate}% occupation</p>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <Target className="h-8 w-8 mx-auto mb-2 text-lime-600" />
                  <p className="text-sm text-muted-foreground">CA/mois estimé</p>
                  <p className="text-2xl font-bold text-lime-600">{(theoreticalDailyRevenue * 30).toFixed(0)} €</p>
                  <p className="text-xs text-muted-foreground">vs objectif {objectives.monthlyRevenue}€</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Indicators */}
          <Card>
            <CardHeader>
              <CardTitle>Indicateurs calculables</CardTitle>
              <CardDescription>
                Ces KPIs seront disponibles dans le dashboard avec les données actuelles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">CA/m²</p>
                  <p className="font-bold text-primary">Actif ✓</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">CA/machine</p>
                  <p className="font-bold text-primary">Actif ✓</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">CA/heure</p>
                  <p className="font-bold text-primary">Actif ✓</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Taux occupation</p>
                  <p className="font-bold text-primary">Actif ✓</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Objectifs CA</p>
                  <p className="font-bold text-primary">Actif ✓</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Alertes maintenance</p>
                  <p className="font-bold text-primary">Actif ✓</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
