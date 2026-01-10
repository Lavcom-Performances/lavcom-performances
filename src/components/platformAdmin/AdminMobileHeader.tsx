import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSelector } from "@/components/ui/language-selector";
import { AdminSidebar } from "./AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { getLastSaasPath } from "@/lib/navigation/lastPaths";

export function AdminMobileHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation(['app']);
  const { profile } = useAuth();

  const getInitials = () => {
    const first = profile?.first_name?.charAt(0)?.toUpperCase() || "";
    const last = profile?.last_name?.charAt(0)?.toUpperCase() || "";
    return first + last || "?";
  };

  const handleSwitchToSaas = () => {
    const lastPath = getLastSaasPath();
    navigate(lastPath || '/select-laundromat');
  };

  return (
    <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-14 px-4 border-b bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-blue-900/50">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <span className="text-white font-bold text-sm">LP</span>
        </div>
        <div className="flex flex-col">
          <span className="font-display font-semibold text-white text-sm">
            Lavcom
          </span>
          <span className="text-[9px] text-blue-300 font-medium uppercase tracking-wider">
            {t('app:platformAdmin.title')}
          </span>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Switch to SaaS */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSwitchToSaas}
          className="text-blue-200 hover:text-white hover:bg-blue-800/50"
        >
          <ArrowLeftRight className="h-5 w-5" />
        </Button>

        {/* Avatar */}
        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
          <AvatarFallback className="text-xs bg-blue-700 text-white">
            {getInitials()}
          </AvatarFallback>
        </Avatar>

        {/* Language */}
        <LanguageSelector variant="sidebar" collapsed />

        {/* Theme */}
        <ThemeToggle collapsed className="text-blue-200 hover:text-white" />

        {/* Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-blue-200 hover:text-white hover:bg-blue-800/50">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-0">
            <div onClick={() => setOpen(false)}>
              <AdminSidebar />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
