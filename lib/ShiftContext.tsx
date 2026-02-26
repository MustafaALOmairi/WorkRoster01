import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ShiftType, formatDate } from "./shift-utils";
import { debouncedSync } from "./DataSync";
import { useAuth } from "./AuthContext";

export interface CustomShiftTimes {
  morning: { start: string; end: string };
  evening: { start: string; end: string };
  night: { start: string; end: string };
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  color: string;
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
  updateHoliday: (holiday: Holiday) => void;
  removeHoliday: (id: string) => void;
  isHolidayDate: (dateStr: string) => Holiday | undefined;
  isLoaded: boolean;
}

const DEFAULT_SHIFT_TIMES: CustomShiftTimes = {
  morning: { start: "06:00", end: "14:00" },
  evening: { start: "14:00", end: "22:00" },
  night: { start: "22:00", end: "06:00" },
};

const DEFAULT_CONFIG: ShiftConfig = {
  startDate: formatDate(new Date()),
  pattern: ["morning"],
  patternId: "custom",
  customShiftTimes: DEFAULT_SHIFT_TIMES,
  holidays: [],
};

const STORAGE_KEY = "@shift_calendar_config";

const ShiftContext = createContext<ShiftContextValue | null>(null);

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ShiftConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const migrated = { ...DEFAULT_CONFIG, ...parsed };
            if (parsed.holidays) {
              migrated.holidays = parsed.holidays.map((h: any) => ({
                id: h.id,
                name: h.name,
                startDate: h.startDate || h.date || formatDate(new Date()),
                endDate: h.endDate || h.date || formatDate(new Date()),
                color: h.color || "#FF9800",
              }));
            }
            setConfig(migrated);
          } catch {}
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const saveConfig = (next: ShiftConfig) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    debouncedSync(user);
  };

  const updateConfig = (partial: Partial<ShiftConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
  };

  const addHoliday = (holiday: Holiday) => {
    setConfig((prev) => {
      const next = { ...prev, holidays: [...prev.holidays, holiday] };
      saveConfig(next);
      return next;
    });
  };

  const updateHoliday = (holiday: Holiday) => {
    setConfig((prev) => {
      const next = { ...prev, holidays: prev.holidays.map((h) => h.id === holiday.id ? holiday : h) };
      saveConfig(next);
      return next;
    });
  };

  const removeHoliday = (id: string) => {
    setConfig((prev) => {
      const next = { ...prev, holidays: prev.holidays.filter((h) => h.id !== id) };
      saveConfig(next);
      return next;
    });
  };

  const isHolidayDate = (dateStr: string): Holiday | undefined => {
    return config.holidays.find((h) => {
      return dateStr >= h.startDate && dateStr <= h.endDate;
    });
  };

  const value = useMemo(
    () => ({ config, updateConfig, addHoliday, updateHoliday, removeHoliday, isHolidayDate, isLoaded }),
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
