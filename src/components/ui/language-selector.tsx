import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  variant?: "default" | "compact" | "sidebar";
  className?: string;
  collapsed?: boolean;
}

export function LanguageSelector({ 
  variant = "default", 
  className,
  collapsed = false 
}: LanguageSelectorProps) {
  const { locale, setLocale, supportedLocales, localeNames, localeFlags } = useLocale();

  if (variant === "sidebar") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "sidebar-item w-full text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors duration-200",
              className
            )}
          >
            <Globe className="h-5 w-5 shrink-0" />
            {!collapsed && (
              <span className="flex items-center gap-2">
                <span>{localeFlags[locale]}</span>
                <span>{localeNames[locale]}</span>
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          side={collapsed ? "right" : "top"}
          className="w-40 bg-popover z-50"
        >
          {supportedLocales.map((lang) => (
            <DropdownMenuItem
              key={lang}
              onClick={() => setLocale(lang)}
              className={cn(
                "cursor-pointer",
                locale === lang && "bg-accent text-accent-foreground"
              )}
            >
              <span className="mr-2">{localeFlags[lang]}</span>
              <span>{localeNames[lang]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-9 w-9", className)}
          >
            <span className="text-base">{localeFlags[locale]}</span>
            <span className="sr-only">Change language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 bg-popover z-50">
          {supportedLocales.map((lang) => (
            <DropdownMenuItem
              key={lang}
              onClick={() => setLocale(lang)}
              className={cn(
                "cursor-pointer",
                locale === lang && "bg-accent text-accent-foreground"
              )}
            >
              <span className="mr-2">{localeFlags[lang]}</span>
              <span>{localeNames[lang]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("gap-2", className)}>
          <span>{localeFlags[locale]}</span>
          <span className="hidden sm:inline">{localeNames[locale]}</span>
          <Globe className="h-4 w-4 sm:hidden" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-popover z-50">
        {supportedLocales.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLocale(lang)}
            className={cn(
              "cursor-pointer",
              locale === lang && "bg-accent text-accent-foreground"
            )}
          >
            <span className="mr-2">{localeFlags[lang]}</span>
            <span>{localeNames[lang]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
