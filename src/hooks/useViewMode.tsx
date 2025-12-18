import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type ViewMode = "simple" | "expert";

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isExpert: boolean;
  toggleViewMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

const VIEW_MODE_KEY = "lavcom-view-mode";

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(VIEW_MODE_KEY);
      return (stored as ViewMode) || "simple";
    }
    return "simple";
  });

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
  };

  const toggleViewMode = () => {
    setViewModeState(prev => prev === "simple" ? "expert" : "simple");
  };

  return (
    <ViewModeContext.Provider 
      value={{ 
        viewMode, 
        setViewMode, 
        isExpert: viewMode === "expert",
        toggleViewMode 
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error("useViewMode must be used within a ViewModeProvider");
  }
  return context;
}
