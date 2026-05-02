import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { debouncedSync, useDataReload } from "./DataSync";
import { useAuth } from "./AuthContext";

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

export interface ShiftIcons {
  morning: string;
  evening: string;
  night: string;
  rest: string;
}

export interface StoreTheme {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  mode: ThemeMode;
  accent: string;
  shiftColors: ShiftColors;
  headerBg: string;
  dayHeaderBg: string;
  surfaceBg: string;
  cardBg: string;
  textColor: string;
  textSecondary: string;
  borderColor: string;
  bottomCardBg?: string;
  bottomCardText?: string;
  shiftIcons?: ShiftIcons;
  dayCellRadius?: number;
  showIconInCell?: boolean;
  selectionBg?: string;
  selectionBorder?: string;
  calendarLayout?: "grid" | "circular";
  backgroundImage?: string;
  backgroundOpacity?: number;
}

export const STORE_THEMES: StoreTheme[] = [
  {
    id: "snow_white",
    name: "Snow White",
    nameAr: "ثلجي نقي",
    description: "Pure white with vibrant colored shifts",
    descriptionAr: "أبيض نقي مع ورديات بألوان زاهية",
    mode: "light",
    accent: "#1565C0",
    shiftColors: { morning: "#FF9800", evening: "#E91E63", night: "#1565C0", rest: "#2E7D32" },
    headerBg: "#FFFFFF",
    dayHeaderBg: "#F5F5F5",
    surfaceBg: "#FFFFFF",
    cardBg: "#FFFFFF",
    textColor: "#1A1A2E",
    textSecondary: "#78909C",
    borderColor: "#E8EAF6",
    bottomCardBg: "#FFFFFF",
    bottomCardText: "#1A1A2E",
    shiftIcons: { morning: "sunny-outline", evening: "partly-sunny-outline", night: "moon-outline", rest: "leaf-outline" },
    dayCellRadius: 50,
    showIconInCell: false,
  },
  {
    id: "deep_space",
    name: "Deep Space",
    nameAr: "فضاء عميق",
    description: "Dark cosmic blue with glowing shifts",
    descriptionAr: "أزرق كوني داكن مع ورديات متوهجة",
    mode: "dark",
    accent: "#64B5F6",
    shiftColors: { morning: "#FFA726", evening: "#F06292", night: "#64B5F6", rest: "#81C784" },
    headerBg: "#0A1628",
    dayHeaderBg: "#0D1F3C",
    surfaceBg: "#0A1628",
    cardBg: "#0D1F3C",
    textColor: "#E8F4F8",
    textSecondary: "#7B9DC2",
    borderColor: "#1E3A5F",
    bottomCardBg: "#0D1F3C",
    bottomCardText: "#E8F4F8",
    shiftIcons: { morning: "planet-outline", evening: "sparkles", night: "star", rest: "planet" },
    dayCellRadius: 4,
    showIconInCell: true,
  },
  {
    id: "rose_blush",
    name: "Rose Blush",
    nameAr: "وردية دافئة",
    description: "Warm rose gradient with coral accents",
    descriptionAr: "تدرج وردي دافئ مع لمسات مرجانية",
    mode: "light",
    accent: "#E91E63",
    shiftColors: { morning: "#FF6D00", evening: "#D81B60", night: "#6A1B9A", rest: "#1B5E20" },
    headerBg: "#FF6B9D",
    dayHeaderBg: "#FFDDE8",
    surfaceBg: "#FFF5F8",
    cardBg: "#FFE4EC",
    textColor: "#880E4F",
    textSecondary: "#C2185B",
    borderColor: "#F8BBD9",
    bottomCardBg: "#E91E63",
    bottomCardText: "#FFFFFF",
    shiftIcons: { morning: "flash", evening: "heart-outline", night: "moon", rest: "heart" },
    dayCellRadius: 50,
    showIconInCell: false,
  },
  {
    id: "ocean_teal",
    name: "Ocean Teal",
    nameAr: "تيل المحيط",
    description: "Refreshing teal with warm golden accents",
    descriptionAr: "تيل منعش مع لمسات ذهبية دافئة",
    mode: "light",
    accent: "#00ACC1",
    shiftColors: { morning: "#FF6D00", evening: "#E91E63", night: "#1A237E", rest: "#1B5E20" },
    headerBg: "#00ACC1",
    dayHeaderBg: "#B2EBF2",
    surfaceBg: "#E0F7FA",
    cardBg: "#B2EBF2",
    textColor: "#006064",
    textSecondary: "#00838F",
    borderColor: "#80DEEA",
    bottomCardBg: "#FF8C00",
    bottomCardText: "#FFFFFF",
    shiftIcons: { morning: "sunny", evening: "water-outline", night: "moon-outline", rest: "leaf" },
    dayCellRadius: 14,
    showIconInCell: false,
  },
  {
    id: "minimalist_white",
    name: "Minimalist White",
    nameAr: "أبيض بسيط",
    description: "Clean, elegant calendar with soft grays",
    descriptionAr: "تقويم نظيف وأنيق بألوان رمادية ناعمة",
    mode: "light",
    accent: "#9E9E9E",
    shiftColors: { morning: "#78909C", evening: "#90A4AE", night: "#546E7A", rest: "#B0BEC5" },
    headerBg: "#FFFFFF",
    dayHeaderBg: "#EEEEEE",
    surfaceBg: "#FAFAFA",
    cardBg: "#F5F5F5",
    textColor: "#212121",
    textSecondary: "#757575",
    borderColor: "#E0E0E0",
    shiftIcons: { morning: "sunny-outline", evening: "partly-sunny-outline", night: "moon-outline", rest: "leaf-outline" },
    dayCellRadius: 50,
    showIconInCell: false,
  },
  {
    id: "purple_dream",
    name: "Purple Dream",
    nameAr: "حلم بنفسجي",
    description: "Lavender and pink aesthetic vibes",
    descriptionAr: "أجواء جمالية بالبنفسجي والوردي",
    mode: "light",
    accent: "#AB47BC",
    shiftColors: { morning: "#CE93D8", evening: "#F48FB1", night: "#7E57C2", rest: "#BA68C8" },
    headerBg: "#F3E5F5",
    dayHeaderBg: "#E1BEE7",
    surfaceBg: "#FCF0FF",
    cardBg: "#F3E5F5",
    textColor: "#4A148C",
    textSecondary: "#7B1FA2",
    borderColor: "#E1BEE7",
    shiftIcons: { morning: "sparkles", evening: "star-outline", night: "star", rest: "heart-outline" },
    dayCellRadius: 50,
    showIconInCell: false,
  },
  {
    id: "bold_classic",
    name: "Bold Classic",
    nameAr: "كلاسيكي جريء",
    description: "Strong black & white with sharp contrast",
    descriptionAr: "أسود وأبيض قوي بتباين حاد",
    mode: "light",
    accent: "#212121",
    shiftColors: { morning: "#FF6F00", evening: "#C62828", night: "#1A237E", rest: "#2E7D32" },
    headerBg: "#212121",
    dayHeaderBg: "#EEEEEE",
    surfaceBg: "#FFFFFF",
    cardBg: "#FAFAFA",
    textColor: "#212121",
    textSecondary: "#616161",
    borderColor: "#BDBDBD",
    shiftIcons: { morning: "sunny", evening: "partly-sunny", night: "moon", rest: "leaf" },
    dayCellRadius: 2,
    showIconInCell: false,
  },
  {
    id: "luxury_gold",
    name: "Luxury Gold",
    nameAr: "ذهبي فاخر",
    description: "Dark black luxury with golden accents",
    descriptionAr: "أسود فاخر مع لمسات ذهبية ملكية",
    mode: "dark",
    accent: "#D4AF37",
    shiftColors: { morning: "#D4AF37", evening: "#C9922A", night: "#A07820", rest: "#8B7536" },
    headerBg: "#0A0A0A",
    dayHeaderBg: "#111111",
    surfaceBg: "#111111",
    cardBg: "#1A1A1A",
    textColor: "#D4AF37",
    textSecondary: "#9A7520",
    borderColor: "#D4AF37",
    bottomCardBg: "#0D0D0D",
    bottomCardText: "#D4AF37",
    shiftIcons: { morning: "sunny", evening: "partly-sunny", night: "moon", rest: "leaf" },
    dayCellRadius: 3,
    showIconInCell: false,
    selectionBg: "rgba(212,175,55,0.18)",
    selectionBorder: "#D4AF37",
  },
  {
    id: "rainbow_light",
    name: "Rainbow Light",
    nameAr: "ألوان قوس قزح",
    description: "Bright white with vibrant colorful shifts",
    descriptionAr: "أبيض مشرق مع ورديات بألوان قوس قزح",
    mode: "light",
    accent: "#6720C8",
    shiftColors: { morning: "#FF6B35", evening: "#E91E8C", night: "#2196F3", rest: "#00BFA5" },
    headerBg: "#FFFFFF",
    dayHeaderBg: "#F8F8FF",
    surfaceBg: "#FFFFFF",
    cardBg: "#FFFFFF",
    textColor: "#1A1A2E",
    textSecondary: "#6B7280",
    borderColor: "#E5E7EB",
    bottomCardBg: "#F3EEFF",
    bottomCardText: "#1A1A2E",
    shiftIcons: { morning: "sunny", evening: "partly-sunny", night: "moon", rest: "leaf" },
    dayCellRadius: 50,
    showIconInCell: false,
    selectionBg: "rgba(103,32,200,0.15)",
    selectionBorder: "#6720C8",
  },
];

export const AVAILABLE_COLORS = [
  "#E67E22", "#E74C8B", "#3F51B5", "#43A047",
  "#FF6D00", "#D500F9", "#304FFE", "#00C853",
  "#0097A7", "#FF7043", "#1565C0", "#26A69A",
  "#FF8F00", "#D84315", "#4527A0", "#2E7D32",
  "#F4A261", "#E76F51", "#264653", "#2A9D8F",
  "#E53935", "#8E24AA", "#1E88E5", "#00897B",
  "#FFB300", "#6D4C41", "#546E7A", "#C0CA33",
  "#F06292", "#7E57C2", "#29B6F6", "#66BB6A",
];

export type CalendarFontScale = "small" | "medium" | "large" | "xlarge";

export const CALENDAR_FONT_SCALE_VALUES: Record<CalendarFontScale, number> = {
  small: 0.85,
  medium: 1,
  large: 1.2,
  xlarge: 1.45,
};

interface AppPrefs {
  theme: ThemeMode;
  language: Language;
  shiftColors: ShiftColors;
  colorPresetIndex: number;
  storeThemeId: string | null;
  accent: string;
  calendarFontScale: CalendarFontScale;
}

interface ThemeContextValue {
  theme: ThemeMode;
  language: Language;
  shiftColors: ShiftColors;
  colorPresetIndex: number;
  colorPresets: typeof COLOR_PRESETS;
  storeThemeId: string | null;
  accent: string;
  aiGeneratedThemes: StoreTheme[];
  activeStoreTheme: StoreTheme | null;
  calendarFontScale: CalendarFontScale;
  calendarFontScaleValue: number;
  setTheme: (t: ThemeMode) => void;
  setLanguage: (l: Language) => void;
  setColorPreset: (index: number) => void;
  setCustomShiftColor: (shift: keyof ShiftColors, color: string) => void;
  applyStoreTheme: (themeId: string | null) => void;
  addAiTheme: (theme: StoreTheme) => void;
  removeAiTheme: (themeId: string) => void;
  setCalendarFontScale: (scale: CalendarFontScale) => void;
  t: (ar: string, en: string) => string;
  isLoaded: boolean;
  isDark: boolean;
}

const DEFAULT_PREFS: AppPrefs = {
  theme: "light",
  language: "ar",
  shiftColors: DEFAULT_SHIFT_COLORS,
  colorPresetIndex: 0,
  storeThemeId: null,
  accent: "#F5A623",
  calendarFontScale: "medium",
};

const STORAGE_KEY = "@shift_calendar_prefs";
const AI_THEMES_KEY = "@shift_calendar_ai_themes";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppPrefs>(DEFAULT_PREFS);
  const [aiGeneratedThemes, setAiGeneratedThemes] = useState<StoreTheme[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();
  const { reloadTrigger } = useDataReload();

  const loadFromStorage = () => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(AI_THEMES_KEY),
    ])
      .then(([stored, storedAi]) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setPrefs({ ...DEFAULT_PREFS, ...parsed });
          } catch {}
        }
        if (storedAi) {
          try {
            setAiGeneratedThemes(JSON.parse(storedAi));
          } catch {}
        }
      })
      .finally(() => setIsLoaded(true));
  };

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (reloadTrigger > 0) {
      loadFromStorage();
    }
  }, [reloadTrigger]);

  const updatePrefs = (partial: Partial<AppPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      debouncedSync(user);
      return next;
    });
  };

  const activeStoreTheme = useMemo(() => {
    if (!prefs.storeThemeId) return null;
    return [...STORE_THEMES, ...aiGeneratedThemes].find((t) => t.id === prefs.storeThemeId) || null;
  }, [prefs.storeThemeId, aiGeneratedThemes]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: prefs.theme,
      language: prefs.language,
      shiftColors: prefs.shiftColors,
      colorPresetIndex: prefs.colorPresetIndex,
      colorPresets: COLOR_PRESETS,
      storeThemeId: prefs.storeThemeId,
      accent: prefs.accent,
      aiGeneratedThemes,
      activeStoreTheme,
      isDark: prefs.theme === "dark",
      isLoaded,
      setTheme: (t) => updatePrefs({ theme: t }),
      setLanguage: (l) => updatePrefs({ language: l }),
      setColorPreset: (index) => {
        const preset = COLOR_PRESETS[index];
        if (preset) {
          updatePrefs({ colorPresetIndex: index, shiftColors: preset.colors, storeThemeId: null, accent: "#F5A623" });
        }
      },
      setCustomShiftColor: (shift, color) => {
        updatePrefs({
          shiftColors: { ...prefs.shiftColors, [shift]: color },
          colorPresetIndex: -1,
          storeThemeId: null,
        });
      },
      applyStoreTheme: (themeId) => {
        if (!themeId) {
          updatePrefs({ storeThemeId: null, accent: "#F5A623", shiftColors: DEFAULT_SHIFT_COLORS, colorPresetIndex: 0, theme: "light" });
          return;
        }
        const allThemes = [...STORE_THEMES, ...aiGeneratedThemes];
        const storeTheme = allThemes.find((t) => t.id === themeId);
        if (storeTheme) {
          updatePrefs({
            storeThemeId: themeId,
            accent: storeTheme.accent,
            shiftColors: storeTheme.shiftColors,
            colorPresetIndex: -1,
            theme: storeTheme.mode,
          });
        }
      },
      addAiTheme: (theme) => {
        setAiGeneratedThemes((prev) => {
          const next = [theme, ...prev].slice(0, 10);
          AsyncStorage.setItem(AI_THEMES_KEY, JSON.stringify(next));
          debouncedSync(user);
          return next;
        });
      },
      setCalendarFontScale: (scale) => updatePrefs({ calendarFontScale: scale }),
      calendarFontScale: prefs.calendarFontScale,
      calendarFontScaleValue: CALENDAR_FONT_SCALE_VALUES[prefs.calendarFontScale] ?? 1,
      removeAiTheme: (themeId) => {
        setAiGeneratedThemes((prev) => {
          const next = prev.filter((t) => t.id !== themeId);
          AsyncStorage.setItem(AI_THEMES_KEY, JSON.stringify(next));
          debouncedSync(user);
          return next;
        });
        if (prefs.storeThemeId === themeId) {
          updatePrefs({ storeThemeId: null, accent: "#F5A623", shiftColors: DEFAULT_SHIFT_COLORS, colorPresetIndex: 0, theme: "light" });
        }
      },
      t: (ar, en) => (prefs.language === "ar" ? ar : en),
    }),
    [prefs, isLoaded, aiGeneratedThemes, activeStoreTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
}
