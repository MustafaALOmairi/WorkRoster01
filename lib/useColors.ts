import { useMemo } from "react";
import { getThemeColors } from "@/constants/colors";
import { useAppTheme } from "./ThemeContext";

export function useColors() {
  const { isDark, shiftColors } = useAppTheme();
  return useMemo(() => getThemeColors(isDark, shiftColors), [isDark, shiftColors]);
}
