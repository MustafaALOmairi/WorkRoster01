import { useMemo } from "react";
import { getThemeColors } from "@/constants/colors";
import { useAppTheme, STORE_THEMES } from "./ThemeContext";

export function useColors() {
  const { isDark, shiftColors, accent, storeThemeId } = useAppTheme();
  const storeTheme = storeThemeId ? STORE_THEMES.find((t) => t.id === storeThemeId) : null;
  return useMemo(() => getThemeColors(isDark, shiftColors, accent, storeTheme ?? undefined), [isDark, shiftColors, accent, storeTheme]);
}
