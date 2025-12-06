import { useState } from "react";
import { ChartFilters } from "@/components/dashboard/ChartFilters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock data fréquentation par heure (basé sur FREQ_H_MCL_CA_2025_D.pdf)
const mockHourlyData = [
  { hour: "07h", count: 575 },
  { hour: "08h", count: 721 },
  { hour: "09h", count: 862 },
  { hour: "10h", count: 1103 },
  { hour: "11h", count: 1180 },
  { hour: "12h", count: 1118 },
  { hour: "13h", count: 1244 },
  { hour: "14h", count: 1282 },
  { hour: "15h", count: 1407 },
  { hour: "16h", count: 1422 },
  { hour: "17h", count: 1358 },
  { hour: "18h", count: 1430 },
  { hour: "19h", count: 1302 },
  { hour: "20h", count: 1178 },
  { hour: "21h", count: 630 },
];

const total = mockHourlyData.reduce((sum, d) => sum + d.count, 0);

export default function HourlyFrequencyPage() {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState("all");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Fréquentation par Heure
          </h1>
          <p className="text-muted-foreground">
            Nombre de cycles par tranche horaire
          </p>
        </div>
        
        <ChartFilters
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedMachine={selectedMachine}
          onMachineChange={setSelectedMachine}
          showYearFilter
          showMonthFilter
          showMachineFilter
        />
      </div>

      {/* Chart */}
      <div className="kpi-card h-[400px]">
        <h3 className="font-display font-semibold text-lg mb-4">Cycles par heure</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={mockHourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="hour" 
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [value, "Cycles"]}
            />
            <Bar 
              dataKey="count" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="kpi-card">
        <h3 className="font-display font-semibold text-lg mb-4">Détail par heure</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Heure</TableHead>
                <TableHead className="text-right">Nombre de cycles</TableHead>
                <TableHead className="text-right">% du total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockHourlyData.map((row) => (
                <TableRow key={row.hour}>
                  <TableCell className="font-medium">{row.hour}</TableCell>
                  <TableCell className="text-right">{row.count}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {((row.count / total) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right text-primary">{total}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
