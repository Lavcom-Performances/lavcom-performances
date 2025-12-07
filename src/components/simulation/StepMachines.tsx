import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WashingMachine, Wind, Plus, Trash2 } from "lucide-react";
import { SimulationProject, SimulationResults, MachineConfig, WASHER_CAPACITIES, DRYER_CAPACITIES } from "@/types/simulation";

interface StepMachinesProps {
  project: SimulationProject;
  results: SimulationResults;
  onUpdate: (updates: Partial<SimulationProject>) => void;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export function StepMachines({ project, results, onUpdate }: StepMachinesProps) {
  const addMachine = (type: 'washer' | 'dryer') => {
    const defaultCapacity = type === 'washer' ? 7 : 13;
    const defaultPrice = type === 'washer' ? 5.5 : 2;
    const newMachine: MachineConfig = {
      id: `${type}_${Date.now()}`,
      type,
      capacity_kg: defaultCapacity,
      count: 1,
      price: defaultPrice,
      cycles_day: 4,
    };
    onUpdate({
      machines: [...project.machines, newMachine]
    });
  };

  const updateMachine = (id: string, updates: Partial<MachineConfig>) => {
    onUpdate({
      machines: project.machines.map(m => 
        m.id === id ? { ...m, ...updates } : m
      )
    });
  };

  const removeMachine = (id: string) => {
    onUpdate({
      machines: project.machines.filter(m => m.id !== id)
    });
  };

  const washers = project.machines.filter(m => m.type === 'washer');
  const dryers = project.machines.filter(m => m.type === 'dryer');

  const getMachineRevenue = (machineId: string) => {
    const revenue = results.machine_revenues.find(r => r.id === machineId);
    return revenue?.turnover_month || 0;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Configuration des machines</h2>
        <p className="text-muted-foreground mt-2">
          Configuration pré-remplie avec une laverie type – ajustez selon votre projet
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lave-linge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WashingMachine className="h-5 w-5 text-primary" />
              Lave-linge
            </CardTitle>
            <CardDescription>
              Configurez vos machines à laver
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {washers.map((machine) => (
              <div key={machine.id} className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Select
                      value={machine.capacity_kg.toString()}
                      onValueChange={(v) => updateMachine(machine.id, { capacity_kg: parseInt(v) })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WASHER_CAPACITIES.map((cap) => (
                          <SelectItem key={cap} value={cap.toString()}>
                            {cap} kg
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                      → {formatCurrency(getMachineRevenue(machine.id))}/mois
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeMachine(machine.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nombre</Label>
                    <Input
                      type="number"
                      min="1"
                      value={machine.count || ''}
                      onChange={(e) => updateMachine(machine.id, { count: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Prix (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={machine.price || ''}
                      onChange={(e) => updateMachine(machine.id, { price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Cycles/jour</Label>
                    <Input
                      type="number"
                      min="0"
                      value={machine.cycles_day || ''}
                      onChange={(e) => updateMachine(machine.id, { cycles_day: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => addMachine('washer')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un lave-linge
            </Button>

            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <p className="text-sm text-muted-foreground">CA lavage estimé</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(results.total_wash_turnover_month)} / mois
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sèche-linge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wind className="h-5 w-5 text-primary" />
              Sèche-linge
            </CardTitle>
            <CardDescription>
              Configurez vos sèche-linge
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dryers.map((machine) => (
              <div key={machine.id} className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Select
                      value={machine.capacity_kg.toString()}
                      onValueChange={(v) => updateMachine(machine.id, { capacity_kg: parseInt(v) })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DRYER_CAPACITIES.map((cap) => (
                          <SelectItem key={cap} value={cap.toString()}>
                            {cap} kg
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                      → {formatCurrency(getMachineRevenue(machine.id))}/mois
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeMachine(machine.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nombre</Label>
                    <Input
                      type="number"
                      min="1"
                      value={machine.count || ''}
                      onChange={(e) => updateMachine(machine.id, { count: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Prix (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={machine.price || ''}
                      onChange={(e) => updateMachine(machine.id, { price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Cycles/jour</Label>
                    <Input
                      type="number"
                      min="0"
                      value={machine.cycles_day || ''}
                      onChange={(e) => updateMachine(machine.id, { cycles_day: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => addMachine('dryer')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un sèche-linge
            </Button>

            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <p className="text-sm text-muted-foreground">CA séchage estimé</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(results.total_dry_turnover_month)} / mois
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Récapitulatif */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-around gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">CA lavage</p>
              <p className="text-xl font-semibold">{formatCurrency(results.total_wash_turnover_month)}</p>
            </div>
            <div className="text-2xl text-muted-foreground">+</div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">CA séchage</p>
              <p className="text-xl font-semibold">{formatCurrency(results.total_dry_turnover_month)}</p>
            </div>
            <div className="text-2xl text-muted-foreground">=</div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">CA total estimé</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(results.project_turnover_month)}</p>
              <p className="text-xs text-muted-foreground">/ mois</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
