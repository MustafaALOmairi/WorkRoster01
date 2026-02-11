import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark";
export type Language = "ar" | "en";

export interface ShiftColors {
  morning: string;
  evening: string;
  night: string;
  rest: string;
}

const DEFAULT_SHIFT_COLORS: ShiftColors = {
  morning: "#E67E22",
  evening: "#E74C8B",
  night: "#3F51B5",
  rest: "#43A047",
};

const COLOR_PRESETS: { name: string; nameAr: string; colors: ShiftColors }[] = [
  { name: "Default", nameAr: "افتراضي", colors: DEFAULT_SHIFT_COLORS },
  { name: "Ocean", nameAr: "محيط", colors: { morning: "#0097A7", evening: "#FF7043", night: "#1565C0", rest: "#26A69A" } },
  { name: "Sunset", nameAr: "غروب", colors: { morning: "#FF8F00", evening: "#D84315", night: "#4527A0", rest: "#2E7D32" } },
  { name: "Pastel", nameAr: "باستيل", colors: { morning: "#F4A261", evening: "#E76F51", night: "#264653", rest: "#2A9D8F" } },
  { name: "Neon", nameAr: "نيون", colors: { morning: "#FF6D00", evening: "#D500F9", night: "#304FFE", rest: "#00C853" } },
];

interface AppPrefs {
  theme: ThemeMode;
  language: Language;
  shiftColors: ShiftColors;
  colorPresetIndex: number;
}

interface ThemeContextValue {
  theme: ThemeMode;
  language: Language;
  shiftColors: ShiftColors;
  colorPresetIndex: number;
  colorPresets: typeof COLOR_PRESETS;
  setTheme: (t: ThemeMode) => void;
  setLanguage: (l: Language) => void;
  setColorPreset: (index: number) => void;
  setCustomShiftColor: (shift: keyof ShiftColors, color: string) => void;
  t: (ar: string, en: string) => string;
  isLoaded: boolean;
  isDark: boolean;
}

const DEFAULT_PREFS: AppPrefs = {
  theme: "light",
  language: "ar",
  shiftColors: DEFAULT_SHIFT_COLORS,
  colorPresetIndex: 0,
};

const STORAGE_KEY = "@shift_calendar_prefs";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppPrefs>(DEFAULT_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setPrefs({ ...DEFAULT_PREFS, ...parsed });
          } catch {}
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const updatePrefs = (partial: Partial<AppPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: prefs.theme,
      language: prefs.language,
      shiftColors: prefs.shiftColors,
      colorPresetIndex: prefs.colorPresetIndex,
      colorPresets: COLOR_PRESETS,
      isDark: prefs.theme === "dark",
      isLoaded,
      setTheme: (t) => updatePrefs({ theme: t }),
      setLanguage: (l) => updatePrefs({ language: l }),
      setColorPreset: (index) => {
        const preset = COLOR_PRESETS[index];
        if (preset) {
          updatePrefs({ colorPresetIndex: index, shiftColors: preset.colors });
        }
      },
      setCustomShiftColor: (shift, color) => {
        updatePrefs({
          shiftColors: { ...prefs.shiftColors, [shift]: color },
          colorPresetIndex: -1,
        });
      },
      t: (ar, en) => (prefs.language === "ar" ? ar : en),
    }),
    [prefs, isLoaded]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
}
