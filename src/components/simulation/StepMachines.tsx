import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WashingMachine, Wind } from "lucide-react";
import { SimulationProject, SimulationResults, WashingMachineConfig, DryerConfig } from "@/types/simulation";

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
  const updateMachine = (field: keyof (WashingMachineConfig & DryerConfig), value: number) => {
    onUpdate({
      machines: {
        ...project.machines,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Configuration des machines</h2>
        <p className="text-muted-foreground mt-2">
          Définissez le nombre de machines, les tarifs et la fréquentation estimée
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
              Configurez vos différentes capacités de lavage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 7 kg */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <Label className="font-semibold">Lave-linge 7 kg</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="wash_7kg_count" className="text-xs text-muted-foreground">Nombre</Label>
                  <Input
                    id="wash_7kg_count"
                    type="number"
                    min="0"
                    value={project.machines.wash_7kg_count || ''}
                    onChange={(e) => updateMachine('wash_7kg_count', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wash_7kg_price" className="text-xs text-muted-foreground">Prix (€)</Label>
                  <Input
                    id="wash_7kg_price"
                    type="number"
                    min="0"
                    step="0.5"
                    value={project.machines.wash_7kg_price || ''}
                    onChange={(e) => updateMachine('wash_7kg_price', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wash_7kg_cycles" className="text-xs text-muted-foreground">Cycles/jour</Label>
                  <Input
                    id="wash_7kg_cycles"
                    type="number"
                    min="0"
                    value={project.machines.wash_7kg_cycles_day || ''}
                    onChange={(e) => updateMachine('wash_7kg_cycles_day', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* 10 kg */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <Label className="font-semibold">Lave-linge 10 kg</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="wash_10kg_count" className="text-xs text-muted-foreground">Nombre</Label>
                  <Input
                    id="wash_10kg_count"
                    type="number"
                    min="0"
                    value={project.machines.wash_10kg_count || ''}
                    onChange={(e) => updateMachine('wash_10kg_count', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wash_10kg_price" className="text-xs text-muted-foreground">Prix (€)</Label>
                  <Input
                    id="wash_10kg_price"
                    type="number"
                    min="0"
                    step="0.5"
                    value={project.machines.wash_10kg_price || ''}
                    onChange={(e) => updateMachine('wash_10kg_price', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wash_10kg_cycles" className="text-xs text-muted-foreground">Cycles/jour</Label>
                  <Input
                    id="wash_10kg_cycles"
                    type="number"
                    min="0"
                    value={project.machines.wash_10kg_cycles_day || ''}
                    onChange={(e) => updateMachine('wash_10kg_cycles_day', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* 18 kg */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <Label className="font-semibold">Lave-linge 18 kg</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="wash_18kg_count" className="text-xs text-muted-foreground">Nombre</Label>
                  <Input
                    id="wash_18kg_count"
                    type="number"
                    min="0"
                    value={project.machines.wash_18kg_count || ''}
                    onChange={(e) => updateMachine('wash_18kg_count', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wash_18kg_price" className="text-xs text-muted-foreground">Prix (€)</Label>
                  <Input
                    id="wash_18kg_price"
                    type="number"
                    min="0"
                    step="0.5"
                    value={project.machines.wash_18kg_price || ''}
                    onChange={(e) => updateMachine('wash_18kg_price', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wash_18kg_cycles" className="text-xs text-muted-foreground">Cycles/jour</Label>
                  <Input
                    id="wash_18kg_cycles"
                    type="number"
                    min="0"
                    value={project.machines.wash_18kg_cycles_day || ''}
                    onChange={(e) => updateMachine('wash_18kg_cycles_day', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

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
              Configurez vos sèche-linge petits et grands
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Petit */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <Label className="font-semibold">Sèche-linge petit (10-13 kg)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dry_small_count" className="text-xs text-muted-foreground">Nombre</Label>
                  <Input
                    id="dry_small_count"
                    type="number"
                    min="0"
                    value={project.machines.dry_small_count || ''}
                    onChange={(e) => updateMachine('dry_small_count', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dry_small_price" className="text-xs text-muted-foreground">Prix (€)</Label>
                  <Input
                    id="dry_small_price"
                    type="number"
                    min="0"
                    step="0.5"
                    value={project.machines.dry_small_price || ''}
                    onChange={(e) => updateMachine('dry_small_price', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dry_small_cycles" className="text-xs text-muted-foreground">Cycles/jour</Label>
                  <Input
                    id="dry_small_cycles"
                    type="number"
                    min="0"
                    value={project.machines.dry_small_cycles_day || ''}
                    onChange={(e) => updateMachine('dry_small_cycles_day', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Grand */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <Label className="font-semibold">Sèche-linge grand (15-18 kg)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dry_large_count" className="text-xs text-muted-foreground">Nombre</Label>
                  <Input
                    id="dry_large_count"
                    type="number"
                    min="0"
                    value={project.machines.dry_large_count || ''}
                    onChange={(e) => updateMachine('dry_large_count', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dry_large_price" className="text-xs text-muted-foreground">Prix (€)</Label>
                  <Input
                    id="dry_large_price"
                    type="number"
                    min="0"
                    step="0.5"
                    value={project.machines.dry_large_price || ''}
                    onChange={(e) => updateMachine('dry_large_price', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dry_large_cycles" className="text-xs text-muted-foreground">Cycles/jour</Label>
                  <Input
                    id="dry_large_cycles"
                    type="number"
                    min="0"
                    value={project.machines.dry_large_cycles_day || ''}
                    onChange={(e) => updateMachine('dry_large_cycles_day', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

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
