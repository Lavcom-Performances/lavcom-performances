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

// Mock data fréquentation par tranche de 30 min (basé sur FREQ_30_MCL_CA_2025_D.pdf)
const mockHalfHourlyData = [
  { time: "07:00", count: 157 },
  { time: "07:30", count: 111 },
  { time: "08:00", count: 239 },
  { time: "08:30", count: 248 },
  { time: "09:00", count: 318 },
  { time: "09:30", count: 336 },
  { time: "10:00", count: 390 },
  { time: "10:30", count: 425 },
  { time: "11:00", count: 507 },
  { time: "11:30", count: 497 },
  { time: "12:00", count: 501 },
  { time: "12:30", count: 464 },
  { time: "13:00", count: 459 },
  { time: "13:30", count: 548 },
  { time: "14:00", count: 522 },
  { time: "14:30", count: 573 },
  { time: "15:00", count: 530 },
  { time: "15:30", count: 574 },
  { time: "16:00", count: 604 },
  { time: "16:30", count: 633 },
  { time: "17:00", count: 578 },
  { time: "17:30", count: 567 },
  { time: "18:00", count: 566 },
  { time: "18:30", count: 592 },
  { time: "19:00", count: 590 },
  { time: "19:30", count: 578 },
  { time: "20:00", count: 501 },
  { time: "20:30", count: 493 },
  { time: "21:00", count: 378 },
  { time: "21:30", count: 323 },
];

const total = mockHalfHourlyData.reduce((sum, d) => sum + d.count, 0);

export default function HalfHourlyFrequencyPage() {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedMachine, setSelectedMachine] = useState("all");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Fréquentation par 30 min
          </h1>
          <p className="text-muted-foreground">
            Nombre de cycles par tranche de 30 minutes
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
        <h3 className="font-display font-semibold text-lg mb-4">Cycles par tranche de 30 min</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={mockHalfHourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              interval={1}
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
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="kpi-card">
        <h3 className="font-display font-semibold text-lg mb-4">Détail par tranche</h3>
        <div className="overflow-x-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Heure</TableHead>
                <TableHead className="text-right">Nombre de cycles</TableHead>
                <TableHead className="text-right">% du total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockHalfHourlyData.map((row) => (
                <TableRow key={row.time}>
                  <TableCell className="font-medium">{row.time}</TableCell>
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
