import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ShiftType, PRESET_PATTERNS, formatDate } from "./shift-utils";

export interface CustomShiftTimes {
  morning: { start: string; end: string };
  evening: { start: string; end: string };
  night: { start: string; end: string };
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
}

interface ShiftConfig {
  startDate: string;
  pattern: ShiftType[];
  patternId: string;
  customShiftTimes: CustomShiftTimes;
  holidays: Holiday[];
}

interface ShiftContextValue {
  config: ShiftConfig;
  updateConfig: (config: Partial<ShiftConfig>) => void;
  addHoliday: (holiday: Holiday) => void;
  removeHoliday: (id: string) => void;
  isLoaded: boolean;
}

const DEFAULT_SHIFT_TIMES: CustomShiftTimes = {
  morning: { start: "06:00", end: "14:00" },
  evening: { start: "14:00", end: "22:00" },
  night: { start: "22:00", end: "06:00" },
};

const DEFAULT_CONFIG: ShiftConfig = {
  startDate: formatDate(new Date()),
  pattern: PRESET_PATTERNS[0].shifts,
  patternId: PRESET_PATTERNS[0].id,
  customShiftTimes: DEFAULT_SHIFT_TIMES,
  holidays: [],
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

  const addHoliday = (holiday: Holiday) => {
    setConfig((prev) => {
      const next = { ...prev, holidays: [...prev.holidays, holiday] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeHoliday = (id: string) => {
    setConfig((prev) => {
      const next = { ...prev, holidays: prev.holidays.filter((h) => h.id !== id) };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({ config, updateConfig, addHoliday, removeHoliday, isLoaded }),
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
