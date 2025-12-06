import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPISectionProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function KPISection({ title, icon: Icon, children, className }: KPISectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}
