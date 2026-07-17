import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  htmlFor?: string;
  hint?: string;
  icon?: LucideIcon;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  hint,
  icon: Icon,
  required,
  error,
  children,
  className,
}: Props) {
  const invalid = Boolean(error);
  return (
    <Field className={cn(className)} data-invalid={invalid || undefined}>
      <FieldLabel
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-sm font-medium text-foreground"
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-foreground" />}
        <span>{label}</span>
        {required && <span className="text-destructive">*</span>}
      </FieldLabel>
      {children}
      {invalid ? (
        <FieldError>{error}</FieldError>
      ) : (
        hint && <FieldDescription>{hint}</FieldDescription>
      )}
    </Field>
  );
}
