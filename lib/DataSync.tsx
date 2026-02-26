import React, { useEffect, useRef, ReactNode, createContext, useContext, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import { apiRequest } from "./query-client";

const SHIFT_KEY = "@shift_calendar_config";
const NOTES_KEY = "@shift_calendar_notes";
const PREFS_KEY = "@shift_calendar_prefs";
const AI_THEMES_KEY = "@shift_calendar_ai_themes";
const LAST_SYNC_KEY = "@shift_calendar_last_sync";

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export function debouncedSync(user: { id: string } | null) {
  if (!user) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncAllData();
  }, 3000);
}

async function syncAllData() {
  try {
    const [shiftConfig, notes, themePrefs, aiThemes] = await Promise.all([
      AsyncStorage.getItem(SHIFT_KEY),
      AsyncStorage.getItem(NOTES_KEY),
      AsyncStorage.getItem(PREFS_KEY),
      AsyncStorage.getItem(AI_THEMES_KEY),
    ]);

    await apiRequest("POST", "/api/user-data/save", {
      shiftConfig: shiftConfig ? JSON.parse(shiftConfig) : null,
      notes: notes ? JSON.parse(notes) : null,
      themePrefs: themePrefs ? JSON.parse(themePrefs) : null,
      aiThemes: aiThemes ? JSON.parse(aiThemes) : null,
    });

    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  } catch (err: any) {
    console.error("Auto-sync failed:", err?.message);
  }
}

export async function loadServerData(): Promise<boolean> {
  try {
    const res = await apiRequest("GET", "/api/user-data/load");
    const data = await res.json();

    if (!data.shiftConfig && !data.notes && !data.themePrefs) {
      return false;
    }

    const writes: Promise<void>[] = [];
    if (data.shiftConfig) {
      writes.push(AsyncStorage.setItem(SHIFT_KEY, JSON.stringify(data.shiftConfig)));
    }
    if (data.notes) {
      writes.push(AsyncStorage.setItem(NOTES_KEY, JSON.stringify(data.notes)));
    }
    if (data.themePrefs) {
      writes.push(AsyncStorage.setItem(PREFS_KEY, JSON.stringify(data.themePrefs)));
    }
    if (data.aiThemes) {
      writes.push(AsyncStorage.setItem(AI_THEMES_KEY, JSON.stringify(data.aiThemes)));
    }
    await Promise.all(writes);
    return true;
  } catch {
    return false;
  }
}

interface DataSyncContextValue {
  reloadTrigger: number;
  triggerReload: () => void;
}

const DataSyncContext = createContext<DataSyncContextValue>({ reloadTrigger: 0, triggerReload: () => {} });

export function useDataReload() {
  return useContext(DataSyncContext);
}

export function DataSyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const prevUserRef = useRef<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const triggerReload = useCallback(() => {
    setReloadTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (user && prevUserRef.current !== user.id) {
      prevUserRef.current = user.id;
      syncAllData();
    }
    if (!user) {
      prevUserRef.current = null;
    }
  }, [user]);

  return (
    <DataSyncContext.Provider value={{ reloadTrigger, triggerReload }}>
      {children}
    </DataSyncContext.Provider>
  );
}
