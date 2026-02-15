import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
  requestNotificationPermission: () => Promise<boolean>;
  isLoaded: boolean;
}

const STORAGE_KEY = "@shift_calendar_notes";

const NotesContext = createContext<NotesContextValue | null>(null);

async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function scheduleReminder(dateKey: string, note: DayNote) {
  if (Platform.OS === "web") return;
  if (!note.reminderEnabled || !note.reminderTime) return;

  const notificationId = `reminder_${dateKey}`;
  await cancelReminder(dateKey);

  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = note.reminderTime.split(":").map(Number);

  const triggerDate = new Date(year, month - 1, day, hour, minute, 0);

  if (triggerDate <= new Date()) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "WorkRoster",
        body: note.text || (hour < 12 ? "تذكير بموعدك" : "Shift reminder"),
        data: { dateKey },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
      identifier: notificationId,
    });
  } catch {}
}

async function cancelReminder(dateKey: string) {
  if (Platform.OS === "web") return;
  const notificationId = `reminder_${dateKey}`;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
}

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

  const setNoteAndSchedule = (dateKey: string, note: DayNote) => {
    saveNotes({ ...notes, [dateKey]: note });
    if (note.reminderEnabled) {
      scheduleReminder(dateKey, note);
    } else {
      cancelReminder(dateKey);
    }
  };

  const getNote = (dateKey: string) => notes[dateKey];

  const deleteNoteAndCancel = (dateKey: string) => {
    const updated = { ...notes };
    delete updated[dateKey];
    saveNotes(updated);
    cancelReminder(dateKey);
  };

  const value = useMemo(
    () => ({
      notes,
      setNote: setNoteAndSchedule,
      getNote,
      deleteNote: deleteNoteAndCancel,
      requestNotificationPermission,
      isLoaded,
    }),
    [notes, isLoaded]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
