import * as React from "react";
import { TabsTrigger, TabsTriggerProps } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const SimulatorTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  TabsTriggerProps
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
