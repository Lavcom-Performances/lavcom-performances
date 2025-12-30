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

// Exact gradient from the uploaded image: green → yellow-green → yellow → orange → salmon red
const GRADIENT_COLORS = [
  "rgb(99, 190, 123)",   // Green (low)
  "rgb(139, 199, 99)",   // Light green
  "rgb(172, 208, 85)",   // Yellow-green
  "rgb(205, 217, 71)",   // Yellow-green brighter
  "rgb(227, 221, 74)",   // Yellow
  "rgb(248, 222, 77)",   // Light yellow
  "rgb(254, 210, 79)",   // Yellow-orange
  "rgb(251, 186, 77)",   // Orange-yellow
  "rgb(249, 165, 77)",   // Orange
  "rgb(248, 140, 80)",   // Orange-red
  "rgb(244, 109, 85)",   // Light red
  "rgb(241, 89, 90)",    // Salmon red
  "rgb(245, 95, 93)",    // Red (high)
];

function getIntensityColor(value: number, maxValue: number): string {
  if (value === 0 || maxValue === 0) return "rgb(198, 224, 180)"; // Very light green for zero
  
  const intensity = value / maxValue;
  const colorIndex = Math.min(Math.floor(intensity * GRADIENT_COLORS.length), GRADIENT_COLORS.length - 1);
  
  return GRADIENT_COLORS[colorIndex];
}

function getTextColor(value: number, maxValue: number): string {
  if (maxValue === 0) return "rgb(50, 50, 50)";
  const intensity = value / maxValue;
  // Dark text for light backgrounds, white for dark backgrounds
  return intensity > 0.6 ? "rgb(255, 255, 255)" : "rgb(50, 50, 50)";
}

export function SalesHeatmap({ data }: SalesHeatmapProps) {
  const { gridMap, maxValue, dayTotals, hourTotals, grandTotal } = useMemo(() => {
    const gridMap = new Map<string, number>();
    let max = 0;
    const dayTotals: Record<string, number> = {};
    const hourTotals: Record<number, number> = {};
    let grandTotal = 0;
    
    // Initialize totals
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
          {/* Totals row */}
          <tr className="font-semibold">
            <td className="p-2 text-left text-sm font-semibold text-foreground border border-border bg-muted/50">
              Total
            </td>
            {DAYS_ORDER.map((day) => (
              <td
                key={`total-${day}`}
                className="p-2 text-center text-sm font-semibold border border-border bg-muted/50"
              >
                {dayTotals[day]}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      
      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
        <span>Calme</span>
        <div className="flex">
          {GRADIENT_COLORS.map((color, i) => (
            <div 
              key={i} 
              className="w-4 h-4" 
              style={{ backgroundColor: color }} 
            />
          ))}
        </div>
        <span>Chargé</span>
      </div>
    </div>
  );
}
