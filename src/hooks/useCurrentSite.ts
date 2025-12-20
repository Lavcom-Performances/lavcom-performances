import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentSite() {
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const siteId = localStorage.getItem("selectedSiteId");
    setCurrentSiteId(siteId);

    if (!siteId) {
      setIsLoading(false);
      return;
    }

    // Fetch site details to check if it's a demo
    const fetchSite = async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name, is_demo")
        .eq("id", siteId)
        .maybeSingle();

      if (!error && data) {
        setIsDemo(data.is_demo || false);
        setSiteName(data.name);
      }
      setIsLoading(false);
    };

    fetchSite();

    // Listen for storage changes (site selection)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedSiteId") {
        setCurrentSiteId(e.newValue);
        if (e.newValue) {
          setIsLoading(true);
          supabase
            .from("sites")
            .select("id, name, is_demo")
            .eq("id", e.newValue)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                setIsDemo(data.is_demo || false);
                setSiteName(data.name);
              }
              setIsLoading(false);
            });
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const refreshSite = async () => {
    const siteId = localStorage.getItem("selectedSiteId");
    if (!siteId) return;

    const { data } = await supabase
      .from("sites")
      .select("id, name, is_demo")
      .eq("id", siteId)
      .maybeSingle();

    if (data) {
      setIsDemo(data.is_demo || false);
      setSiteName(data.name);
    }
  };

  return {
    currentSiteId,
    isDemo,
    siteName,
    isLoading,
    refreshSite,
  };
}
