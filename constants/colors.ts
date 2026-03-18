interface StoreThemeOverride {
  headerBg: string;
  dayHeaderBg: string;
  surfaceBg: string;
  cardBg: string;
  textColor: string;
  textSecondary: string;
  borderColor: string;
}

export function getThemeColors(isDark: boolean, shiftColors: { morning: string; evening: string; night: string; rest: string }, accent?: string, storeTheme?: StoreThemeOverride) {
  const lighten = (hex: string, amount: number) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
    return `rgb(${r},${g},${b})`;
  };

  const accentColor = accent || "#F5A623";
  const accentLightColor = lighten(accentColor, 0.35);

  return {
    isDark,
    primary: storeTheme?.textColor || (isDark ? "#FFFFFF" : "#0F2027"),
    primaryLight: isDark ? "#CCCCCC" : "#1A3A4A",
    accent: accentColor,
    accentLight: accentLightColor,
    surface: storeTheme?.surfaceBg || (isDark ? "#0A0A0A" : "#FFFFFF"),
    surfaceSecondary: storeTheme?.cardBg || (isDark ? "#1A1A1A" : "#F4F6F8"),
    surfaceTertiary: isDark ? "#252525" : "#EAEEF2",
    text: storeTheme?.textColor || (isDark ? "#FFFFFF" : "#0F2027"),
    textSecondary: storeTheme?.textSecondary || (isDark ? "#999" : "#6B7C8A"),
    textLight: "#FFFFFF",
    border: storeTheme?.borderColor || (isDark ? "#333" : "#E2E8EE"),
    cardBg: storeTheme?.cardBg || (isDark ? "#1A1A1A" : "#F4F6F8"),

    shifts: {
      morning: {
        bg: isDark ? `rgba(${parseInt(shiftColors.morning.slice(1, 3), 16)},${parseInt(shiftColors.morning.slice(3, 5), 16)},${parseInt(shiftColors.morning.slice(5, 7), 16)},0.15)` : lighten(shiftColors.morning, 0.7),
        color: shiftColors.morning,
      },
      evening: {
        bg: isDark ? `rgba(${parseInt(shiftColors.evening.slice(1, 3), 16)},${parseInt(shiftColors.evening.slice(3, 5), 16)},${parseInt(shiftColors.evening.slice(5, 7), 16)},0.15)` : lighten(shiftColors.evening, 0.7),
        color: shiftColors.evening,
      },
      night: {
        bg: isDark ? `rgba(${parseInt(shiftColors.night.slice(1, 3), 16)},${parseInt(shiftColors.night.slice(3, 5), 16)},${parseInt(shiftColors.night.slice(5, 7), 16)},0.15)` : lighten(shiftColors.night, 0.7),
        color: shiftColors.night,
      },
      rest: {
        bg: isDark ? `rgba(${parseInt(shiftColors.rest.slice(1, 3), 16)},${parseInt(shiftColors.rest.slice(3, 5), 16)},${parseInt(shiftColors.rest.slice(5, 7), 16)},0.15)` : lighten(shiftColors.rest, 0.7),
        color: shiftColors.rest,
      },
    },

    light: {
      text: isDark ? "#FFFFFF" : "#0F2027",
      background: isDark ? "#0A0A0A" : "#FFFFFF",
      tint: isDark ? "#FFFFFF" : "#0F2027",
      tabIconDefault: isDark ? "#888" : "#6B7C8A",
      tabIconSelected: isDark ? "#FFFFFF" : "#0F2027",
    },
  };
}

const Colors = getThemeColors(false, {
  morning: "#E67E22",
  evening: "#E74C8B",
  night: "#3F51B5",
  rest: "#43A047",
});

export default Colors;
