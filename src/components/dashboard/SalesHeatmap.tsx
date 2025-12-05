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
  
  if (intensity < 0.25) return "hsl(72, 80%, 85%)"; // Light green
  if (intensity < 0.5) return "hsl(72, 80%, 65%)";  // Medium light green
  if (intensity < 0.75) return "hsl(72, 80%, 50%)"; // Medium green
  return "hsl(72, 80%, 43%)"; // Lavcom green (full)
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
        <span>Moins</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: "hsl(var(--muted))" }} />
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: "hsl(72, 80%, 85%)" }} />
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: "hsl(72, 80%, 65%)" }} />
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: "hsl(72, 80%, 50%)" }} />
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: "hsl(72, 80%, 43%)" }} />
        </div>
        <span>Plus</span>
      </div>
    </div>
  );
}
