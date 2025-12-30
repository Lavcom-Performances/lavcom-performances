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
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7h to 21h

function getIntensityColor(value: number, maxValue: number): string {
  if (value === 0 || maxValue === 0) return "hsl(120, 50%, 85%)"; // Very light green for zero
  
  const intensity = value / maxValue;
  
  // Gradient from green (low) → yellow → orange → red (high) - like Excel
  if (intensity < 0.2) return "hsl(120, 60%, 75%)"; // Light green
  if (intensity < 0.35) return "hsl(100, 60%, 70%)"; // Yellow-green
  if (intensity < 0.5) return "hsl(60, 70%, 65%)";  // Yellow
  if (intensity < 0.65) return "hsl(45, 80%, 60%)"; // Yellow-orange
  if (intensity < 0.8) return "hsl(30, 85%, 55%)";  // Orange
  if (intensity < 0.9) return "hsl(15, 85%, 50%)";  // Orange-red
  return "hsl(0, 80%, 50%)"; // Red
}

function getTextColor(value: number, maxValue: number): string {
  if (maxValue === 0) return "hsl(0, 0%, 30%)";
  const intensity = value / maxValue;
  return intensity > 0.6 ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 20%)";
}

export function SalesHeatmap({ data }: SalesHeatmapProps) {
  const { gridMap, maxValue } = useMemo(() => {
    const gridMap = new Map<string, number>();
    let max = 0;
    
    data.forEach(({ day, hour, cycles }) => {
      const key = `${hour}-${day}`;
      gridMap.set(key, cycles);
      if (cycles > max) max = cycles;
    });
    
    return { gridMap, maxValue: max };
  }, [data]);

  return (
    <div data-pdf-chart="sales-heatmap" className="kpi-card overflow-x-auto">
      <h3 className="font-display font-semibold text-lg mb-4">Heatmap des cycles (heure × jour)</h3>
      
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left text-xs font-medium text-muted-foreground border border-border bg-muted/50 w-20">
              HEURES
            </th>
            {DAYS_FULL.map((day) => (
              <th 
                key={day} 
                className="p-2 text-center text-xs font-medium text-muted-foreground border border-border bg-muted/50 min-w-[80px]"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour}>
              <td className="p-2 text-left text-sm font-medium text-muted-foreground border border-border bg-muted/30 w-20">
                {hour.toString().padStart(2, '0')}
              </td>
              {DAYS_ORDER.map((day) => {
                const value = gridMap.get(`${hour}-${day}`) || 0;
                const bgColor = getIntensityColor(value, maxValue);
                const textColor = getTextColor(value, maxValue);
                
                return (
                  <td
                    key={`${hour}-${day}`}
                    className="p-2 text-center text-sm font-medium border border-border min-w-[80px] transition-transform hover:scale-105 cursor-default"
                    style={{ 
                      backgroundColor: bgColor,
                      color: textColor
                    }}
                    title={`${day} ${hour}h: ${value} cycles`}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
        <span>Calme</span>
        <div className="flex gap-0.5">
          <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: "hsl(120, 60%, 75%)" }} />
          <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: "hsl(100, 60%, 70%)" }} />
          <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: "hsl(60, 70%, 65%)" }} />
          <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: "hsl(45, 80%, 60%)" }} />
          <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: "hsl(30, 85%, 55%)" }} />
          <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: "hsl(15, 85%, 50%)" }} />
          <div className="w-5 h-4 rounded-sm" style={{ backgroundColor: "hsl(0, 80%, 50%)" }} />
        </div>
        <span>Chargé</span>
      </div>
    </div>
  );
}
