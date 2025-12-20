import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Site {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postal_code?: string;
  is_default: boolean;
}

export function useSites() {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSites([]);
      setIsLoading(false);
      return;
    }

    fetchSites();
  }, [user]);

  const fetchSites = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("sites")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("name");

      if (fetchError) throw fetchError;

      setSites(data || []);
    } catch (err) {
      console.error("Error fetching sites:", err);
      setError("Impossible de charger les laveries");
    } finally {
      setIsLoading(false);
    }
  };

  const createSite = async (site: Omit<Site, "id" | "is_default">) => {
    if (!user) throw new Error("User not authenticated");

    const { data, error: insertError } = await supabase
      .from("sites")
      .insert({
        user_id: user.id,
        name: site.name,
        address: site.address,
        city: site.city,
        postal_code: site.postal_code,
        is_default: sites.length === 0, // First site is default
      })
      .select()
      .single();

    if (insertError) throw insertError;

    setSites((prev) => [...prev, data]);
    return data;
  };

  const getDefaultSite = () => {
    return sites.find((s) => s.is_default) || sites[0] || null;
  };

  return {
    sites,
    isLoading,
    error,
    fetchSites,
    createSite,
    getDefaultSite,
  };
}
