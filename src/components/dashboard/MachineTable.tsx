import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MachineCAData {
  name: string;
  capacity: string;
  caEsp: number;
  caCb: number;
  caTotal: number;
  caPrevu: number;
}

interface MachineVentesData {
  name: string;
  capacity: string;
  ventesEsp: number;
  ventesCb: number;
  ventesTotal: number;
}

interface MachineCATableProps {
  data: MachineCAData[];
  totals: {
    esp: number;
    cb: number;
    total: number;
    prevu: number;
  };
}

interface MachineVentesTableProps {
  data: MachineVentesData[];
  totals: {
    esp: number;
    cb: number;
    total: number;
  };
}

export function MachineCATable({ data, totals }: MachineCATableProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <div className="kpi-card">
      <h3 className="font-display font-semibold text-lg mb-4">CA par Machine</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Machine</TableHead>
              <TableHead className="text-right">CA ESP</TableHead>
              <TableHead className="text-right">CA CB</TableHead>
              <TableHead className="text-right font-semibold">TOTAL</TableHead>
              <TableHead className="text-right text-muted-foreground">CA PRÉVU</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((machine, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {machine.name} <span className="text-muted-foreground text-sm">{machine.capacity}</span>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(machine.caEsp)}</TableCell>
                <TableCell className="text-right">{formatCurrency(machine.caCb)}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{formatCurrency(machine.caTotal)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(machine.caPrevu)}</TableCell>
              </TableRow>
            ))}
            {/* Totals row */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.esp)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.cb)}</TableCell>
              <TableCell className="text-right text-primary">{formatCurrency(totals.total)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{formatCurrency(totals.prevu)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function MachineVentesTable({ data, totals }: MachineVentesTableProps) {
  return (
    <div className="kpi-card">
      <h3 className="font-display font-semibold text-lg mb-4">Ventes par Machine</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Machine</TableHead>
              <TableHead className="text-right">ESP</TableHead>
              <TableHead className="text-right">CB</TableHead>
              <TableHead className="text-right font-semibold">TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((machine, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {machine.name} <span className="text-muted-foreground text-sm">{machine.capacity}</span>
                </TableCell>
                <TableCell className="text-right">{machine.ventesEsp}</TableCell>
                <TableCell className="text-right">{machine.ventesCb}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{machine.ventesTotal}</TableCell>
              </TableRow>
            ))}
            {/* Totals row */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-right">{totals.esp}</TableCell>
              <TableCell className="text-right">{totals.cb}</TableCell>
              <TableCell className="text-right text-primary">{totals.total}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
