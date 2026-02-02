/**
 * AdminGlobalSearch.tsx
 * 
 * Global search component for platform admins.
 * Searches users and sites with keyboard navigation.
 * TAEX-236
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, User, Building2, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformRole } from "@/hooks/usePlatformRole";
import { logAdminSearchEvent } from "@/lib/duplicateLogger";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchUser {
  id: string;
  email: string;
  display_name: string;
  company_name: string | null;
}

interface SearchSite {
  id: string;
  name: string;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  address: string | null;
  owner_id: string;
}

interface SearchResults {
  users: SearchUser[];
  sites: SearchSite[];
}

interface AdminGlobalSearchProps {
  collapsed?: boolean;
}

export function AdminGlobalSearch({ collapsed = false }: AdminGlobalSearchProps) {
  const { t } = useTranslation(["app"]);
  const navigate = useNavigate();
  const { isPlatformAdmin } = usePlatformRole();
  
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ users: [], sites: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Calculate total results for keyboard navigation
  const totalResults = results.users.length + results.sites.length;

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults({ users: [], sites: [] });
      setSelectedIndex(-1);
      return;
    }

    const doSearch = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('rpc_admin_global_search', {
          p_query: debouncedQuery,
          p_limit: 10,
        });

        if (error) {
          console.error('[AdminGlobalSearch] Search error:', error);
          setResults({ users: [], sites: [] });
          return;
        }

        const searchResults = data as unknown as SearchResults;
        setResults(searchResults);
        setSelectedIndex(-1);

        // Log search event
        logAdminSearchEvent(
          debouncedQuery.length,
          searchResults.users.length,
          searchResults.sites.length
        );
      } catch (error) {
        console.error('[AdminGlobalSearch] Unexpected error:', error);
        setResults({ users: [], sites: [] });
      } finally {
        setIsLoading(false);
      }
    };

    doSearch();
  }, [debouncedQuery]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (totalResults === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, totalResults - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          // Determine which item is selected
          if (selectedIndex < results.users.length) {
            handleUserClick(results.users[selectedIndex]);
          } else {
            handleSiteClick(results.sites[selectedIndex - results.users.length]);
          }
        }
        break;
      case 'Escape':
        setOpen(false);
        setQuery("");
        break;
    }
  }, [totalResults, selectedIndex, results]);

  const handleUserClick = (user: SearchUser) => {
    navigate(`/admin/users?search=${encodeURIComponent(user.email)}`);
    setOpen(false);
    setQuery("");
  };

  const handleSiteClick = (site: SearchSite) => {
    navigate(`/admin/sites?search=${encodeURIComponent(site.name)}`);
    setOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    setQuery("");
    setResults({ users: [], sites: [] });
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Don't render if not platform admin
  if (!isPlatformAdmin) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "text-[#A8B4D0] hover:text-white hover:bg-[#5C6B9A]/50",
            collapsed ? "w-10 h-10" : "w-full justify-start gap-2"
          )}
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
        >
          <Search className="h-4 w-4" />
          {!collapsed && (
            <span className="text-sm">
              {t("app:platformAdmin.globalSearch.placeholder", "Search users, sites...")}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0"
        align="start"
        side="right"
        sideOffset={8}
      >
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("app:platformAdmin.globalSearch.inputPlaceholder", "Search by email, name, site...")}
              className="pl-10 pr-10"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[350px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : query.length >= 2 && totalResults === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("app:platformAdmin.globalSearch.noResults", "No results found")}
            </div>
          ) : (
            <div className="p-2">
              {/* Users section */}
              {results.users.length > 0 && (
                <div className="mb-3">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                    {t("app:platformAdmin.globalSearch.users", "Users")}
                  </p>
                  <div className="space-y-1">
                    {results.users.map((user, index) => (
                      <button
                        key={user.id}
                        onClick={() => handleUserClick(user)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                          "hover:bg-accent",
                          selectedIndex === index && "bg-accent"
                        )}
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.email}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.display_name?.trim() || user.company_name || '-'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sites section */}
              {results.sites.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                    {t("app:platformAdmin.globalSearch.sites", "Sites")}
                  </p>
                  <div className="space-y-1">
                    {results.sites.map((site, index) => {
                      const adjustedIndex = results.users.length + index;
                      return (
                        <button
                          key={site.id}
                          onClick={() => handleSiteClick(site)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                            "hover:bg-accent",
                            selectedIndex === adjustedIndex && "bg-accent"
                          )}
                        >
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-secondary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{site.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {site.city}{site.postal_code && `, ${site.postal_code}`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Keyboard hints */}
        {totalResults > 0 && (
          <div className="p-2 border-t text-xs text-muted-foreground flex items-center gap-3">
            <span>↑↓ {t("app:platformAdmin.globalSearch.navigate", "Navigate")}</span>
            <span>↵ {t("app:platformAdmin.globalSearch.select", "Select")}</span>
            <span>Esc {t("app:platformAdmin.globalSearch.close", "Close")}</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
