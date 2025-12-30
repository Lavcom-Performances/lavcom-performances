import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ChartFiltersProps {
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  selectedYear?: string;
  onYearChange?: (year: string) => void;
  selectedMachine?: string;
  onMachineChange?: (machine: string) => void;
  selectedPayment?: string;
  onPaymentChange?: (payment: string) => void;
  showMonthFilter?: boolean;
  showYearFilter?: boolean;
  showMachineFilter?: boolean;
  showPaymentFilter?: boolean;
}

const months = [
  { value: "all", label: "Tous les mois" },
  { value: "01", label: "Janvier" },
  { value: "02", label: "Février" },
  { value: "03", label: "Mars" },
  { value: "04", label: "Avril" },
  { value: "05", label: "Mai" },
  { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" },
  { value: "08", label: "Août" },
  { value: "09", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
];

const years = [
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
];

const machines = [
  { value: "all", label: "Toutes les machines" },
  { value: "lave-8kg", label: "Lave-linge 8kg" },
  { value: "lave-12kg", label: "Lave-linge 12kg" },
  { value: "lave-18kg", label: "Lave-linge 18kg" },
  { value: "seche", label: "Sèche-linge" },
  { value: "lessive", label: "Lessive" },
  { value: "rech-cb", label: "Rech CB" },
  { value: "rech-esp", label: "Rech ESP" },
];

const payments = [
  { value: "all", label: "Tous les paiements" },
  { value: "cb", label: "Carte bancaire" },
  { value: "esp", label: "Espèces" },
  { value: "fi", label: "Fidélité" },
];

export function ChartFilters({
  selectedMonth = "all",
  onMonthChange,
  selectedYear = "2025",
  onYearChange,
  selectedMachine = "all",
  onMachineChange,
  selectedPayment = "all",
  onPaymentChange,
  showMonthFilter = false,
  showYearFilter = false,
  showMachineFilter = false,
  showPaymentFilter = false,
}: ChartFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      {showYearFilter && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Année</Label>
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger className="w-[120px] h-9 bg-card">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showMonthFilter && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Mois</Label>
          <Select value={selectedMonth} onValueChange={onMonthChange}>
            <SelectTrigger className="w-[160px] h-9 bg-card">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showMachineFilter && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Machine</Label>
          <Select value={selectedMachine} onValueChange={onMachineChange}>
            <SelectTrigger className="w-[180px] h-9 bg-card">
              <SelectValue placeholder="Machine" />
            </SelectTrigger>
            <SelectContent>
              {machines.map((machine) => (
                <SelectItem key={machine.value} value={machine.value}>
                  {machine.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showPaymentFilter && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Paiement</Label>
          <Select value={selectedPayment} onValueChange={onPaymentChange}>
            <SelectTrigger className="w-[160px] h-9 bg-card">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              {payments.map((payment) => (
                <SelectItem key={payment.value} value={payment.value}>
                  {payment.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
