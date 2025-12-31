import { create } from "zustand";

interface RefreshState {
  /** Sites currently being refreshed */
  refreshingSites: Set<string>;
  /** Set a site as refreshing */
  setRefreshing: (siteId: string, isRefreshing: boolean) => void;
  /** Check if a site is being refreshed */
  isRefreshing: (siteId: string) => boolean;
}

/**
 * Global state store for tracking analytics refresh status
 * Used to show loading indicators across all pages during refresh
 */
export const useRefreshState = create<RefreshState>((set, get) => ({
  refreshingSites: new Set(),
  
  setRefreshing: (siteId: string, isRefreshing: boolean) => {
    set((state) => {
      const newSet = new Set(state.refreshingSites);
      if (isRefreshing) {
        newSet.add(siteId);
      } else {
        newSet.delete(siteId);
      }
      return { refreshingSites: newSet };
    });
  },
  
  isRefreshing: (siteId: string) => {
    return get().refreshingSites.has(siteId);
  },
}));
