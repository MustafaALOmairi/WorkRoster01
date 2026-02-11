import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ShiftType, PRESET_PATTERNS, formatDate } from "./shift-utils";

interface ShiftConfig {
  startDate: string;
  pattern: ShiftType[];
  patternId: string;
}

interface ShiftContextValue {
  config: ShiftConfig;
  updateConfig: (config: Partial<ShiftConfig>) => void;
  isLoaded: boolean;
}

const DEFAULT_CONFIG: ShiftConfig = {
  startDate: formatDate(new Date()),
  pattern: PRESET_PATTERNS[0].shifts,
  patternId: PRESET_PATTERNS[0].id,
};

const STORAGE_KEY = "@shift_calendar_config";

const ShiftContext = createContext<ShiftContextValue | null>(null);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ShiftConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setConfig({ ...DEFAULT_CONFIG, ...parsed });
          } catch {}
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const updateConfig = (partial: Partial<ShiftConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({ config, updateConfig, isLoaded }),
    [config, isLoaded]
  );

  return (
    <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>
  );
}

export function useShiftConfig() {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error("useShiftConfig must be used within ShiftProvider");
  return ctx;
}
