import { useMemo } from "react";

interface SalesHeatmapProps {
  data: Array<{
    day: string;
    hour: number;
    cycles: number;
  }>;
}

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7h to 21h

function getIntensityColor(value: number, maxValue: number): string {
  if (value === 0) return "hsl(var(--muted))";
  
  const intensity = value / maxValue;
  
  // Green for low frequency, Red for high frequency (as per PDF reference)
  if (intensity < 0.25) return "hsl(120, 60%, 75%)"; // Light green - calm
  if (intensity < 0.5) return "hsl(60, 70%, 65%)";   // Yellow-green - moderate
  if (intensity < 0.75) return "hsl(30, 80%, 55%)";  // Orange - busy
  return "hsl(0, 70%, 50%)"; // Red - very busy
}

export function SalesHeatmap({ data }: SalesHeatmapProps) {
  const { grid, maxValue } = useMemo(() => {
    const gridMap = new Map<string, number>();
    let max = 0;
    
    data.forEach(({ day, hour, cycles }) => {
      const key = `${day}-${hour}`;
      gridMap.set(key, cycles);
      if (cycles > max) max = cycles;
    });
    
    return { grid: gridMap, maxValue: max };
  }, [data]);

  return (
    <div className="kpi-card h-[400px]">
      <h3 className="font-display font-semibold text-lg mb-4">Heatmap des cycles (jour × heure)</h3>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header row with hours */}
          <div className="flex">
            <div className="w-12 h-8 flex items-center justify-center text-xs text-muted-foreground font-medium">
              {/* Empty corner */}
            </div>
            {HOURS.map((hour) => (
              <div 
                key={hour} 
                className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground font-medium"
              >
                {hour}h
              </div>
            ))}
          </div>
          
          {/* Data rows */}
          {DAYS.map((day) => (
            <div key={day} className="flex">
              <div className="w-12 h-8 flex items-center justify-center text-xs text-muted-foreground font-medium">
                {day}
              </div>
              {HOURS.map((hour) => {
                const value = grid.get(`${day}-${hour}`) || 0;
                return (
                  <div
                    key={`${day}-${hour}`}
                    className="w-8 h-8 m-0.5 rounded-sm flex items-center justify-center text-xs font-medium cursor-default transition-transform hover:scale-110"
                    style={{ backgroundColor: getIntensityColor(value, maxValue) }}
                    title={`${day} ${hour}h: ${value} cycles`}
                  >
                    {value > 0 && (
                      <span className={value / maxValue > 0.5 ? "text-white" : "text-foreground"}>
                        {value}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Calme</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: "hsl(var(--muted))" }} />
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: "hsl(120, 60%, 75%)" }} />
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: "hsl(60, 70%, 65%)" }} />
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: "hsl(30, 80%, 55%)" }} />
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: "hsl(0, 70%, 50%)" }} />
        </div>
        <span>Chargé</span>
      </div>
    </div>
  );
}
