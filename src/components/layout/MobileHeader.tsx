import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSelector } from "@/components/ui/language-selector";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

interface MobileHeaderProps {
  userRole?: string;
  currentLaundromat?: string;
}

export function MobileHeader({ 
  userRole = "ADMIN", 
  currentLaundromat = "Laverie Saint-Michel" 
}: MobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();

  const getInitials = () => {
    const first = profile?.first_name?.charAt(0)?.toUpperCase() || "";
    const last = profile?.last_name?.charAt(0)?.toUpperCase() || "";
    return first + last || "?";
  };

  return (
    <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50 transition-all duration-300">
      <a 
        href="/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:opacity-80 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg min-h-[44px] min-w-[44px] px-1"
      >
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-transform duration-200 hover:scale-110">
          <span className="text-primary-foreground font-bold text-sm">LP</span>
        </div>
        <span className="font-display font-semibold text-foreground hidden xs:inline">Lavcom</span>
      </a>

      <div className="flex items-center gap-1">
        {/* Avatar link to profile */}
        <Link to="/profile" className="mr-1">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Link>
        
        {/* View Mode Toggle - compact on mobile */}
        <ViewModeToggle variant="compact" className="mr-1" />
        
        <LanguageSelector variant="compact" />
        <ThemeToggle collapsed className="text-foreground" />
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "text-foreground relative transition-all duration-300",
                open && "rotate-90"
              )}
            >
              <Menu className={cn(
                "h-5 w-5 absolute transition-all duration-300",
                open ? "opacity-0 rotate-90" : "opacity-100 rotate-0"
              )} />
              <X className={cn(
                "h-5 w-5 absolute transition-all duration-300",
                open ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"
              )} />
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="p-0 w-72 border-r-primary/20"
          >
            <div onClick={() => setOpen(false)} className="animate-slide-in-left">
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
