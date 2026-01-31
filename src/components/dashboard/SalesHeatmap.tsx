import { useMemo } from "react";

interface SalesHeatmapProps {
  data: Array<{
    day: string;
    hour: number;
    cycles: number;
  }>;
}

const DAYS_ORDER = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

const GRADIENT_COLORS = [
  "rgb(99, 190, 123)",
  "rgb(139, 199, 99)",
  "rgb(172, 208, 85)",
  "rgb(205, 217, 71)",
  "rgb(227, 221, 74)",
  "rgb(248, 222, 77)",
  "rgb(254, 210, 79)",
  "rgb(251, 186, 77)",
  "rgb(249, 165, 77)",
  "rgb(248, 140, 80)",
  "rgb(244, 109, 85)",
  "rgb(241, 89, 90)",
  "rgb(245, 95, 93)",
];

function getIntensityColor(value: number, maxValue: number): string {
  if (value === 0 || maxValue === 0) return "rgb(198, 224, 180)";
  const intensity = value / maxValue;
  const colorIndex = Math.min(Math.floor(intensity * GRADIENT_COLORS.length), GRADIENT_COLORS.length - 1);
  return GRADIENT_COLORS[colorIndex];
}

function getTextColor(value: number, maxValue: number): string {
  if (maxValue === 0) return "rgb(50, 50, 50)";
  const intensity = value / maxValue;
  return intensity > 0.6 ? "rgb(255, 255, 255)" : "rgb(50, 50, 50)";
}

export function SalesHeatmap({ data }: SalesHeatmapProps) {
  const { gridMap, maxValue, dayTotals, hourTotals, grandTotal } = useMemo(() => {
    const gridMap = new Map<string, number>();
    let max = 0;
    const dayTotals: Record<string, number> = {};
    const hourTotals: Record<number, number> = {};
    let grandTotal = 0;
    
    DAYS_ORDER.forEach(day => dayTotals[day] = 0);
    HOURS.forEach(hour => hourTotals[hour] = 0);
    
    data.forEach(({ day, hour, cycles }) => {
      const key = `${hour}-${day}`;
      gridMap.set(key, cycles);
      if (cycles > max) max = cycles;
      dayTotals[day] = (dayTotals[day] || 0) + cycles;
      hourTotals[hour] = (hourTotals[hour] || 0) + cycles;
      grandTotal += cycles;
    });
    
    return { gridMap, maxValue: max, dayTotals, hourTotals, grandTotal };
  }, [data]);

  return (
    <div data-pdf-chart="sales-heatmap" className="dashboard-card overflow-x-auto">
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">Heatmap des cycles</h3>
        <span className="text-xs text-muted-foreground">heure × jour</span>
      </div>
      
      <div className="overflow-x-auto -mx-1">
        <table className="w-full border-collapse text-xs min-w-[600px]">
          <thead>
            <tr>
              <th className="p-1.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide border border-border bg-muted/30 w-14">
                Heures
              </th>
              {DAYS_FULL.map((day) => (
                <th 
                  key={day} 
                  className="p-1.5 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wide border border-border bg-muted/30"
                >
                  {day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <td className="p-1.5 text-center text-xs font-medium text-muted-foreground border border-border bg-muted/20 tabular-nums">
                  {hour}h
                </td>
                {DAYS_ORDER.map((day) => {
                  const value = gridMap.get(`${hour}-${day}`) || 0;
                  const bgColor = getIntensityColor(value, maxValue);
                  const textColor = getTextColor(value, maxValue);
                  
                  return (
                    <td
                      key={`${hour}-${day}`}
                      className="p-1.5 text-center text-xs font-medium border border-border tabular-nums"
                      style={{ backgroundColor: bgColor, color: textColor }}
                      title={`${day} ${hour}h: ${value} cycles`}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="p-1.5 text-center text-xs font-semibold text-foreground border border-border bg-muted/50">
                Total
              </td>
              {DAYS_ORDER.map((day) => (
                <td
                  key={`total-${day}`}
                  className="p-1.5 text-center text-xs font-semibold border border-border bg-muted/50 tabular-nums"
                >
                  {dayTotals[day]}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-muted-foreground">
        <span>Calme</span>
        <div className="flex rounded overflow-hidden">
          {GRADIENT_COLORS.filter((_, i) => i % 2 === 0).map((color, i) => (
            <div key={i} className="w-3 h-3" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span>Chargé</span>
      </div>
    </div>
  );
}
