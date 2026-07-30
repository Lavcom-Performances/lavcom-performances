import { Progress } from "@/components/ui/progress";

interface ProgressProps {
  value: number;
  double?: boolean;
  height?: number;
}

export function ProgressBarWithValue({ value, double, height=3 }:ProgressProps) {
  const offset = 25;
  return (
    <div className="relative w-full max-w-md">
      <Progress
        value={value}
        className={double
          ? `h-${height} bg-lavcom-orange`
          : `h-${height}`
        }
      />
      <span
        className="absolute inset-y-0 font-semibold text-[10px] text-white pointer-events-none"
        style={{
          left: `calc(${value}% - ${offset}px)`,
        }}
      >
        {Math.round(value)}%
      </span>
      {double && (
        <span
          className="absolute inset-y-0 font-semibold text-[10px] text-white pointer-events-none"
          style={{
            left: `calc(${value}% + ${2}px)`,
          }}
        >
          {Math.round(100 - value)}%
        </span>
      )}
    </div>
  );
}