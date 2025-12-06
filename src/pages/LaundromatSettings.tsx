import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { Building2, Clock, WashingMachine, Wind, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Machine {
  id: string;
  name: string;
  type: "LL" | "SL";
  capacity: number;
  cycleDuration: number;
}

export default function LaundromatSettings() {
  // Laundromat info
  const [laundromatName, setLaundromatName] = useState("Laverie Exemple");
  const [address, setAddress] = useState("123 Rue de la Laverie, 75001 Paris");
  
  // Operating hours
  const [openingTime, setOpeningTime] = useState("07:00");
  const [closingTime, setClosingTime] = useState("22:00");
  const [operatingHours, setOperatingHours] = useState(15);

  // Machines
  const [machines, setMachines] = useState<Machine[]>([
    { id: "LL1", name: "Lave-linge 1", type: "LL", capacity: 8, cycleDuration: 40 },
    { id: "LL2", name: "Lave-linge 2", type: "LL", capacity: 8, cycleDuration: 40 },
    { id: "LL3", name: "Lave-linge 3", type: "LL", capacity: 12, cycleDuration: 45 },
    { id: "LL4", name: "Lave-linge 4", type: "LL", capacity: 18, cycleDuration: 50 },
    { id: "SL1", name: "Sèche-linge 1", type: "SL", capacity: 14, cycleDuration: 8 },
    { id: "SL2", name: "Sèche-linge 2", type: "SL", capacity: 14, cycleDuration: 8 },
    { id: "SL3", name: "Sèche-linge 3", type: "SL", capacity: 14, cycleDuration: 8 },
  ]);

  // Calculate operating hours when times change
  const calculateOperatingHours = (open: string, close: string) => {
    const [openH, openM] = open.split(":").map(Number);
    const [closeH, closeM] = close.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    return Math.round((closeMinutes - openMinutes) / 60 * 10) / 10;
  };

  const handleOpeningChange = (value: string) => {
    setOpeningTime(value);
    setOperatingHours(calculateOperatingHours(value, closingTime));
  };

  const handleClosingChange = (value: string) => {
    setClosingTime(value);
    setOperatingHours(calculateOperatingHours(openingTime, value));
  };

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
    // Here you would save to backend/database
    toast.success("Paramètres enregistrés avec succès");
  };

  // Calculate optimal cycles
  const washingMachines = machines.filter(m => m.type === "LL");
  const dryerMachines = machines.filter(m => m.type === "SL");
  const operatingMinutes = operatingHours * 60;

  const avgWashingCycle = washingMachines.length > 0 
    ? Math.round(washingMachines.reduce((sum, m) => sum + m.cycleDuration, 0) / washingMachines.length)
    : 40;
  const avgDryerCycle = dryerMachines.length > 0
    ? Math.round(dryerMachines.reduce((sum, m) => sum + m.cycleDuration, 0) / dryerMachines.length)
    : 8;

  const optimalWashingCyclesPerDay = Math.floor(operatingMinutes / avgWashingCycle);
  const optimalDryerCyclesPerDay = Math.floor(operatingMinutes / avgDryerCycle);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Paramètres de la laverie
          </h1>
          <p className="text-muted-foreground mt-1">
            Informations et configuration de votre établissement
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la laverie</Label>
              <Input
                id="name"
                value={laundromatName}
                onChange={(e) => setLaundromatName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horaires d'ouverture
            </CardTitle>
            <CardDescription>
              Ces horaires sont utilisés pour le calcul du taux d'occupation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening">Ouverture</Label>
                <Input
                  id="opening"
                  type="time"
                  value={openingTime}
                  onChange={(e) => handleOpeningChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing">Fermeture</Label>
                <Input
                  id="closing"
                  type="time"
                  value={closingTime}
                  onChange={(e) => handleClosingChange(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">
                Plage horaire : <span className="text-primary font-bold">{operatingHours}h</span> par jour
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Soit {operatingMinutes} minutes d'exploitation quotidienne
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculated Metrics */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Capacité théorique (cycles optimaux par jour)</CardTitle>
          <CardDescription>
            Calculée à partir des horaires et durées de cycles moyennes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-background rounded-lg">
              <WashingMachine className="h-8 w-8 mx-auto mb-2 text-chart-cb" />
              <p className="text-sm text-muted-foreground">Lave-linge</p>
              <p className="text-2xl font-bold text-chart-cb">{optimalWashingCyclesPerDay}</p>
              <p className="text-xs text-muted-foreground">cycles/jour (moy. {avgWashingCycle} min)</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <Wind className="h-8 w-8 mx-auto mb-2 text-chart-esp" />
              <p className="text-sm text-muted-foreground">Sèche-linge</p>
              <p className="text-2xl font-bold text-chart-esp">{optimalDryerCyclesPerDay}</p>
              <p className="text-xs text-muted-foreground">cycles/jour (moy. {avgDryerCycle} min)</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Par mois (30j)</p>
              <p className="text-lg font-bold">
                <span className="text-chart-cb">{optimalWashingCyclesPerDay * 30 * washingMachines.length}</span>
                {" + "}
                <span className="text-chart-esp">{optimalDryerCyclesPerDay * 30 * dryerMachines.length}</span>
              </p>
              <p className="text-xs text-muted-foreground">cycles LL + SL</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Machines Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <WashingMachine className="h-5 w-5" />
                Parc machines
              </CardTitle>
              <CardDescription>
                {washingMachines.length} lave-linge, {dryerMachines.length} sèche-linge
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[120px]">Capacité (kg)</TableHead>
                <TableHead className="w-[150px]">Durée cycle (min)</TableHead>
                <TableHead className="w-[120px]">Cycles/jour</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((machine) => {
                const cyclesPerDay = Math.floor(operatingMinutes / machine.cycleDuration);
                return (
                  <TableRow key={machine.id}>
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
                          ? "bg-chart-cb/20 text-chart-cb" 
                          : "bg-chart-esp/20 text-chart-esp"
                      }`}>
                        {machine.type === "LL" ? "Lave-linge" : "Sèche-linge"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={machine.capacity}
                        onChange={(e) => updateMachine(machine.id, "capacity", parseInt(e.target.value))}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={machine.cycleDuration}
                        onChange={(e) => updateMachine(machine.id, "cycleDuration", parseInt(e.target.value))}
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-primary">
                      {cyclesPerDay}
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
        </CardContent>
      </Card>
    </div>
  );
}
