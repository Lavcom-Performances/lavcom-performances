import { Menu, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";
import { useState } from "react";

interface MobileHeaderProps {
  userRole?: string;
  currentLaundromat?: string;
}

export function MobileHeader({ 
  userRole = "ADMIN", 
  currentLaundromat = "Laverie Saint-Michel" 
}: MobileHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-background sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">L</span>
        </div>
        <span className="font-display font-semibold text-foreground">Lavcom</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span className="truncate max-w-[150px]">{currentLaundromat}</span>
        </div>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <div onClick={() => setOpen(false)}>
              <AppSidebar 
                collapsed={false}
                userRole={userRole}
                currentLaundromat={currentLaundromat}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
