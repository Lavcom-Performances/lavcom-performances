import { useState } from "react";
import { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Mock data for V1
const mockOperations = [
  { id: "1", date: new Date(), label: "Lave-linge 6kg #1", category: "LAVE_LINGE", paymentMode: "CB", amount: 6.50, detail: "Cycle complet" },
  { id: "2", date: new Date(), label: "Sèche-linge 15min #2", category: "SECHE_LINGE", paymentMode: "ESP", amount: 2.00, detail: "" },
  { id: "3", date: subDays(new Date(), 1), label: "Lessive dose", category: "LESSIVE", paymentMode: "CB", amount: 1.50, detail: "" },
  { id: "4", date: subDays(new Date(), 1), label: "Rech CB", category: "RECHARGE_CB", paymentMode: "CB", amount: 10.00, detail: "simplypay" },
  { id: "5", date: subDays(new Date(), 2), label: "Rech ESP", category: "RECHARGE_ESP", paymentMode: "ESP", amount: 5.00, detail: "tube" },
  { id: "6", date: subDays(new Date(), 2), label: "Lave-linge 8kg #3", category: "LAVE_LINGE", paymentMode: "FI", amount: 8.00, detail: "Cycle intensif" },
];

const paymentModeBadge = (mode: string) => {
  switch (mode) {
    case "CB":
      return <span className="badge-cb">CB</span>;
    case "ESP":
      return <span className="badge-esp">ESP</span>;
    case "FI":
      return <span className="badge-fi">FI</span>;
    default:
      return <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">{mode}</span>;
  }
};

const categoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    LAVE_LINGE: "Lave-linge",
    SECHE_LINGE: "Sèche-linge",
    LESSIVE: "Lessive",
    RECHARGE_CB: "Recharge CB",
    RECHARGE_ESP: "Recharge ESP",
    AUTRE: "Autre",
  };
  return labels[category] || category;
};

export default function Operations() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const filteredOperations = mockOperations.filter((op) => {
    const matchesSearch = op.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || op.category === categoryFilter;
    const matchesPayment = paymentFilter === "all" || op.paymentMode === paymentFilter;
    return matchesSearch && matchesCategory && matchesPayment;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Opérations
          </h1>
          <p className="text-muted-foreground">
            Journal chronologique des transactions
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4" />
          Exporter
        </Button>
      </div>

      {/* Filters */}
      <div className="card-lavcom p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <DateRangePicker 
            dateRange={dateRange}
            onDateChange={setDateRange}
          />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              <SelectItem value="LAVE_LINGE">Lave-linge</SelectItem>
              <SelectItem value="SECHE_LINGE">Sèche-linge</SelectItem>
              <SelectItem value="LESSIVE">Lessive</SelectItem>
              <SelectItem value="RECHARGE_CB">Recharge CB</SelectItem>
              <SelectItem value="RECHARGE_ESP">Recharge ESP</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous paiements</SelectItem>
              <SelectItem value="CB">Carte bancaire</SelectItem>
              <SelectItem value="ESP">Espèces</SelectItem>
              <SelectItem value="FI">Fidélité</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="card-lavcom overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Heure</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Paiement</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Détail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOperations.map((op) => (
              <TableRow key={op.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">
                  {format(op.date, "dd/MM/yyyy", { locale: fr })}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(op.date, "HH:mm", { locale: fr })}
                </TableCell>
                <TableCell>{op.label}</TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {categoryLabel(op.category)}
                  </span>
                </TableCell>
                <TableCell>{paymentModeBadge(op.paymentMode)}</TableCell>
                <TableCell className="text-right font-medium">
                  {op.amount.toFixed(2)} €
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {op.detail || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredOperations.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune opération trouvée</p>
            <p className="text-sm">Essayez de modifier vos filtres</p>
          </div>
        )}
      </div>
    </div>
  );
}
