import * as React from "react";
import { cn } from "@/lib/utils";

const FormCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-form", className)}
      {...props}
    />
  ),
);
FormCard.displayName = "FormCard";

export { FormCard };
export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
