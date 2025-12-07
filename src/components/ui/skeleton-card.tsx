import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonCardProps {
  className?: string;
  variant?: "kpi" | "chart" | "table" | "default";
}

export function SkeletonCard({ className, variant = "default" }: SkeletonCardProps) {
  if (variant === "kpi") {
    return (
      <div className={cn("bg-card rounded-xl p-6 border border-border/50 animate-pulse", className)}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className={cn("bg-card rounded-xl p-6 border border-border/50 animate-pulse", className)}>
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="flex items-end gap-2 h-48">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="flex-1 rounded-t"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("bg-card rounded-xl p-6 border border-border/50 animate-pulse", className)}>
        <Skeleton className="h-5 w-48 mb-6" />
        <div className="space-y-4">
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-8 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-xl p-6 border border-border/50 animate-pulse", className)}>
      <Skeleton className="h-5 w-32 mb-4" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function SkeletonKPIRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant="kpi" />
      ))}
    </div>
  );
}
