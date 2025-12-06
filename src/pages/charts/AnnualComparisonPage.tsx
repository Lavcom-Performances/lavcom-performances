import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock data CA annuel comparatif (basé sur BREF_MCL_CA_2025_D.pdf)
const mockAnnualData = [
  { month: "Janvier", y2021: 4193.45, y2022: 6637.00, y2023: 7031.00, y2024: 6950.00, y2025: 6097.60 },
  { month: "Février", y2021: 3456.00, y2022: 5627.00, y2023: 5706.00, y2024: 8027.60, y2025: 5412.70 },
  { month: "Mars", y2021: 3733.50, y2022: 6262.50, y2023: 7148.00, y2024: 7604.40, y2025: 5705.30 },
  { month: "Avril", y2021: 3567.50, y2022: 5899.50, y2023: 6611.00, y2024: 7462.20, y2025: 5271.50 },
  { month: "Mai", y2021: 4282.50, y2022: 5744.50, y2023: 6941.50, y2024: 7374.50, y2025: 5803.10 },
  { month: "Juin", y2021: 4081.00, y2022: 5259.00, y2023: 5606.00, y2024: 6836.30, y2025: 5381.10 },
  { month: "Juillet", y2021: 4706.50, y2022: 5443.50, y2023: 6008.50, y2024: 7026.70, y2025: 5395.00 },
  { month: "Août", y2021: 5580.50, y2022: 5920.00, y2023: 6012.00, y2024: 8470.40, y2025: 6211.15 },
  { month: "Septembre", y2021: 6242.50, y2022: 6794.00, y2023: 6862.00, y2024: 8056.00, y2025: 6550.40 },
  { month: "Octobre", y2021: 7282.00, y2022: 8354.50, y2023: 7695.00, y2024: 7606.70, y2025: 6156.20 },
  { month: "Novembre", y2021: 6467.00, y2022: 7515.00, y2023: 7453.00, y2024: 6786.50, y2025: 6136.90 },
  { month: "Décembre", y2021: 6230.50, y2022: 6641.00, y2023: 7044.50, y2024: 6255.30, y2025: null },
];

const yearTotals = {
  y2021: 59822.95,
  y2022: 76097.50,
  y2023: 80118.50,
  y2024: 88456.60,
  y2025: 64120.95,
};

export default function AnnualComparisonPage() {
  const [selectedYear, setSelectedYear] = useState("2025");

  const formatCurrency = (value: number | null) => 
    value !== null 
      ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
      : "-";

  const getVariation = (current: number | null, previous: number | null) => {
    if (current === null || previous === null || previous === 0) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            CA Annuel Comparatif
          </h1>
          <p className="text-muted-foreground">
            Évolution du chiffre d'affaires par année
          </p>
        </div>
        
        <ChartFilters
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          showYearFilter
        />
      </div>

      <div className="kpi-card">
        <h3 className="font-display font-semibold text-lg mb-4">CA par mois et par année</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Mois</TableHead>
                <TableHead className="text-right">2021</TableHead>
                <TableHead className="text-right">2022</TableHead>
                <TableHead className="text-right">2023</TableHead>
                <TableHead className="text-right">2024</TableHead>
                <TableHead className="text-right font-semibold">2025</TableHead>
                <TableHead className="text-right text-muted-foreground">Évolution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAnnualData.map((row) => {
                const variation = getVariation(row.y2025, row.y2024);
                return (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{row.month}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.y2021)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.y2022)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.y2023)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.y2024)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatCurrency(row.y2025)}</TableCell>
                    <TableCell className={`text-right ${variation && parseFloat(variation) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {variation ? `${parseFloat(variation) >= 0 ? '+' : ''}${variation}%` : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{formatCurrency(yearTotals.y2021)}</TableCell>
                <TableCell className="text-right">{formatCurrency(yearTotals.y2022)}</TableCell>
                <TableCell className="text-right">{formatCurrency(yearTotals.y2023)}</TableCell>
                <TableCell className="text-right">{formatCurrency(yearTotals.y2024)}</TableCell>
                <TableCell className="text-right text-primary">{formatCurrency(yearTotals.y2025)}</TableCell>
                <TableCell className="text-right text-red-600">
                  {getVariation(yearTotals.y2025, yearTotals.y2024)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
