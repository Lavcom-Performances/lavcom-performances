import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { updateLastPath } from "@/lib/navigation/lastPaths";

/**
 * Component that tracks route changes and updates the last visited path.
 * Should be placed inside the Router context.
 */
export function PathTracker() {
  const location = useLocation();

  useEffect(() => {
    updateLastPath(location.pathname);
  }, [location.pathname]);

  return null;
}
