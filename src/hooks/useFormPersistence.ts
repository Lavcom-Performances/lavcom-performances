import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_PREFIX = "form_draft_";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface FormPersistenceOptions<T> {
  /**
   * Unique key to identify this form's data in localStorage
   */
  key: string;
  /**
   * Initial/default form data
   */
  initialData: T;
  /**
   * Optional: Time-to-live in milliseconds (default: 24 hours)
   */
  ttlMs?: number;
  /**
   * Optional: Debounce delay in milliseconds for saving (default: 500ms)
   */
  debounceMs?: number;
  /**
   * Optional: Whether persistence is enabled (default: true)
   */
  enabled?: boolean;
}

interface StoredData<T> {
  data: T;
  timestamp: number;
  version: number;
}

const STORAGE_VERSION = 1;

/**
 * Hook to persist form state to localStorage with auto-restore and TTL.
 * Survives page refreshes and browser crashes.
 * 
 * @example
 * const { formData, setFormData, clearSavedData, hasSavedData } = useFormPersistence({
 *   key: "add-laundromat",
 *   initialData: { name: "", city: "" },
 * });
 */
export function useFormPersistence<T extends object>({
  key,
  initialData,
  ttlMs = DEFAULT_TTL_MS,
  debounceMs = 500,
  enabled = true,
}: FormPersistenceOptions<T>) {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Load saved data from localStorage
  const loadSavedData = useCallback((): T | null => {
    if (!enabled || typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;

      const parsed: StoredData<T> = JSON.parse(stored);

      // Check version compatibility
      if (parsed.version !== STORAGE_VERSION) {
        localStorage.removeItem(storageKey);
        return null;
      }

      // Check TTL
      const now = Date.now();
      if (now - parsed.timestamp > ttlMs) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn(`[useFormPersistence] Failed to load data for key "${key}":`, error);
      localStorage.removeItem(storageKey);
      return null;
    }
  }, [enabled, storageKey, ttlMs, key]);

  // Initialize state with saved data or initial data
  const [formData, setFormDataInternal] = useState<T>(() => {
    const saved = loadSavedData();
    return saved ? { ...initialData, ...saved } : initialData;
  });

  const [hasSavedData, setHasSavedData] = useState(() => {
    if (!enabled || typeof window === "undefined") return false;
    const stored = localStorage.getItem(storageKey);
    return !!stored;
  });

  // Save data to localStorage (debounced)
  const saveToStorage = useCallback(
    (data: T) => {
      if (!enabled || typeof window === "undefined") return;

      // Clear any pending save
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        try {
          const stored: StoredData<T> = {
            data,
            timestamp: Date.now(),
            version: STORAGE_VERSION,
          };
          localStorage.setItem(storageKey, JSON.stringify(stored));
          setHasSavedData(true);
        } catch (error) {
          console.warn(`[useFormPersistence] Failed to save data for key "${key}":`, error);
        }
      }, debounceMs);
    },
    [enabled, storageKey, debounceMs, key]
  );

  // Wrapper for setFormData that also saves to storage
  const setFormData = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setFormDataInternal((prev) => {
        const newData = typeof updater === "function" ? (updater as (prev: T) => T)(prev) : updater;
        saveToStorage(newData);
        return newData;
      });
    },
    [saveToStorage]
  );

  // Clear saved data from localStorage
  const clearSavedData = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    try {
      localStorage.removeItem(storageKey);
      setHasSavedData(false);
    } catch (error) {
      console.warn(`[useFormPersistence] Failed to clear data for key "${key}":`, error);
    }
  }, [enabled, storageKey, key]);

  // Reset form to initial data and clear storage
  const resetForm = useCallback(() => {
    setFormDataInternal(initialData);
    clearSavedData();
  }, [initialData, clearSavedData]);

  // Restore saved data (useful for showing a "restore draft" button)
  const restoreSavedData = useCallback(() => {
    const saved = loadSavedData();
    if (saved) {
      setFormDataInternal({ ...initialData, ...saved });
    }
  }, [loadSavedData, initialData]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Mark as initialized after first render
  useEffect(() => {
    isInitializedRef.current = true;
  }, []);

  return {
    /**
     * Current form data (auto-restored from localStorage on mount)
     */
    formData,
    /**
     * Update form data (auto-saves to localStorage with debounce)
     */
    setFormData,
    /**
     * Clear saved data from localStorage (call on successful submit)
     */
    clearSavedData,
    /**
     * Reset form to initial data and clear storage
     */
    resetForm,
    /**
     * Whether there is saved data in localStorage
     */
    hasSavedData,
    /**
     * Manually restore saved data
     */
    restoreSavedData,
  };
}

/**
 * Utility to clear all form drafts from localStorage
 */
export function clearAllFormDrafts(): void {
  if (typeof window === "undefined") return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
