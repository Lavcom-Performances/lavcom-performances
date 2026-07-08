import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const SimulatorTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn(
      "data-[state=active]:bg-primary data-[state=active]:text-foreground",
      className,
    )}
    {...props}
  />
));
SimulatorTabsTrigger.displayName = "SimulatorTabsTrigger";
