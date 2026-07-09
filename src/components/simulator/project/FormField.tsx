import { ReactNode, Children, cloneElement, isValidElement } from "react";
import { LucideIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  htmlFor?: string;
  hint?: string;
  icon?: LucideIcon;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

function injectStyle(node: ReactNode): ReactNode {
  if (!isValidElement(node)) return node;

  const nodeProps = node.props as { className?: string; children?: ReactNode };

  // Apply style to the node itself (Input, Textarea, etc.)
  const styledNode = cloneElement(node, {
    className: cn(nodeProps.className, "bg-white shadow-lavcom"),
  });

  // Recursively style nested children (e.g. SelectTrigger inside Select)
  if (nodeProps.children) {
    const styledNested = Children.map(nodeProps.children, (child) => {
      if (isValidElement(child) && child.type === SelectTrigger) {
        return cloneElement(child, {
          className: cn(
            (child.props as { className?: string }).className,
            "bg-white shadow-lavcom"
          ),
        });
      }
      return child;
    });
    return cloneElement(styledNode, { children: styledNested });
  }

  return styledNode;
}

export function FormField({ label, htmlFor, hint, icon: Icon, required, children, className }: Props) {
  const styledChildren = Children.map(children, injectStyle);

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-sm font-medium text-foreground"
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-foreground" />}
        <span>{label}</span>
        {required && <span className="text-destructive">*</span>}
      </Label>
      {styledChildren}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
