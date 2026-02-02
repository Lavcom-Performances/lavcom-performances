import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY_PREFIX = "activeLaundromatId";

interface Site {
  id: string;
  name: string;
  status: string;
  is_demo: boolean;
}

interface ActiveLaundromatState {
  activeLaundromatId: string | "all" | null;
  activeLaundromat: Site | null;
  sites: Site[];
  isLoading: boolean;
  setActiveLaundromatId: (id: string | "all") => void;
  isAllLaundromats: boolean;
  isClosed: boolean;
}

export function useActiveLaundromat(): ActiveLaundromatState {
  const { user } = useAuth();
  const [activeLaundromatId, setActiveLaundromatIdState] = useState<string | "all" | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get storage key scoped to user
  const getStorageKey = useCallback(() => {
    return user?.id ? `${STORAGE_KEY_PREFIX}_${user.id}` : STORAGE_KEY_PREFIX;
  }, [user?.id]);

  // Fetch sites for the user
  useEffect(() => {
    if (!user?.id) {
      setSites([]);
      setIsLoading(false);
      return;
    }

    const fetchSites = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("sites")
        .select("id, name, status, is_demo")
        .eq("user_id", user.id)
        .eq("is_demo", false)
        .order("name");

      if (!error && data) {
        setSites(data);
      }
      setIsLoading(false);
    };

    fetchSites();
  }, [user?.id]);

  // Initialize active laundromat from localStorage or defaults
  useEffect(() => {
    if (isLoading || !user?.id) return;

    const storageKey = getStorageKey();
    const storedId = localStorage.getItem(storageKey);
    const activeSites = sites.filter(s => s.status === "active");

    // Apply default selection rules
    if (storedId) {
      // Validate stored ID is still valid
      const isValidSite = sites.some(s => s.id === storedId);
      if (isValidSite || storedId === "all") {
        setActiveLaundromatIdState(storedId);
        // Also update the legacy selectedSiteId for compatibility
        if (storedId !== "all") {
          localStorage.setItem("selectedSiteId", storedId);
        }
        return;
      }
    }

    // Default rules:
    // - 1 active site → auto-select it
    // - >1 active sites → default to 'all'
    if (activeSites.length === 1) {
      const singleSite = activeSites[0];
      setActiveLaundromatIdState(singleSite.id);
      localStorage.setItem(storageKey, singleSite.id);
      localStorage.setItem("selectedSiteId", singleSite.id);
    } else if (activeSites.length > 1) {
      setActiveLaundromatIdState("all");
      localStorage.setItem(storageKey, "all");
    } else if (sites.length > 0) {
      // Only closed sites exist, select the first one
      setActiveLaundromatIdState(sites[0].id);
      localStorage.setItem(storageKey, sites[0].id);
      localStorage.setItem("selectedSiteId", sites[0].id);
    }
  }, [sites, isLoading, user?.id, getStorageKey]);

  // Setter that persists to localStorage
  const setActiveLaundromatId = useCallback((id: string | "all") => {
    const storageKey = getStorageKey();
    setActiveLaundromatIdState(id);
    localStorage.setItem(storageKey, id);
    
    // Also update legacy selectedSiteId for compatibility with existing hooks
    if (id !== "all") {
      localStorage.setItem("selectedSiteId", id);
      // Dispatch storage event for useCurrentSite to pick up
      window.dispatchEvent(new StorageEvent("storage", {
        key: "selectedSiteId",
        newValue: id,
      }));
    }
  }, [getStorageKey]);

  // Find active laundromat details
  const activeLaundromat = activeLaundromatId && activeLaundromatId !== "all"
    ? sites.find(s => s.id === activeLaundromatId) || null
    : null;

  const isAllLaundromats = activeLaundromatId === "all";
  const isClosed = activeLaundromat?.status === "closed";

  return {
    activeLaundromatId,
    activeLaundromat,
    sites,
    isLoading,
    setActiveLaundromatId,
    isAllLaundromats,
    isClosed,
  };
}

/**
 * Hook that returns true if a single laundromat is required but context is 'all'
 */
export function useRequireSingleLaundromat() {
  const { activeLaundromatId, isAllLaundromats, isLoading } = useActiveLaundromat();
  
  return {
    requiresSingleLaundromat: isAllLaundromats,
    hasValidSelection: !isAllLaundromats && activeLaundromatId !== null,
    isLoading,
  };
}
