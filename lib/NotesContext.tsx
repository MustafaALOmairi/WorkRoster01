import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DayNote {
  text: string;
  reminderEnabled: boolean;
  reminderTime: string;
}

interface NotesContextValue {
  notes: Record<string, DayNote>;
  setNote: (dateKey: string, note: DayNote) => void;
  getNote: (dateKey: string) => DayNote | undefined;
  deleteNote: (dateKey: string) => void;
  isLoaded: boolean;
}

const STORAGE_KEY = "@shift_calendar_notes";

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Record<string, DayNote>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            setNotes(JSON.parse(stored));
          } catch {}
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const saveNotes = (updated: Record<string, DayNote>) => {
    setNotes(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const setNote = (dateKey: string, note: DayNote) => {
    saveNotes({ ...notes, [dateKey]: note });
  };

  const getNote = (dateKey: string) => notes[dateKey];

  const deleteNote = (dateKey: string) => {
    const updated = { ...notes };
    delete updated[dateKey];
    saveNotes(updated);
  };

  const value = useMemo(
    () => ({ notes, setNote, getNote, deleteNote, isLoaded }),
    [notes, isLoaded]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
