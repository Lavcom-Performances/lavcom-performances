import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Props {
  label: string;
  htmlFor?: string;
  hint?: string;
  icon?: LucideIcon;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, hint, icon: Icon, required, children, className }: Props) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-sm font-medium text-foreground"
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-foreground" />}
        <span>{label}</span>
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
