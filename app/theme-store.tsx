import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/lib/useColors";
import { useAppTheme, STORE_THEMES, StoreTheme } from "@/lib/ThemeContext";
import { useSound } from "@/lib/SoundContext";
import * as Haptics from "expo-haptics";

const MINI_DAYS = [
  [null, null, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26],
];

const SHIFT_CYCLE: ("morning" | "evening" | "night" | "rest")[] = ["morning", "evening", "night", "rest"];

function MiniCalendarPreview({ theme }: { theme: StoreTheme }) {
  const lighten = (hex: string, amount: number) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
    return `rgb(${r},${g},${b})`;
  };

  return (
    <View style={[miniStyles.calendar, { backgroundColor: theme.surfaceBg, borderColor: theme.borderColor }]}>
      <View style={[miniStyles.calHeader, { backgroundColor: theme.headerBg }]}>
        <Text style={[miniStyles.calMonth, { color: theme.headerBg === "#212121" ? "#FFFFFF" : theme.textColor }]}>
          2026
        </Text>
      </View>
      <View style={[miniStyles.dayHeaders, { backgroundColor: theme.dayHeaderBg }]}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <View key={i} style={miniStyles.dayHeaderCell}>
            <Text style={[miniStyles.dayHeaderText, { color: theme.textSecondary }]}>{d}</Text>
          </View>
        ))}
      </View>
      {MINI_DAYS.map((week, wi) => (
        <View key={wi} style={miniStyles.weekRow}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={di} style={miniStyles.dayCell} />;
            }
            const shiftType = SHIFT_CYCLE[(day - 1) % 4];
            const shiftColor = theme.shiftColors[shiftType];
            const bgColor = lighten(shiftColor, 0.65);
            return (
              <View
                key={di}
                style={[miniStyles.dayCell, { backgroundColor: bgColor, borderRadius: 3 }]}
              >
                <Text style={[miniStyles.dayNum, { color: shiftColor }]}>{day}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function ThemeCard({
  theme,
  isActive,
  onApply,
  language,
}: {
  theme: StoreTheme;
  isActive: boolean;
  onApply: () => void;
  language: string;
}) {
  const colors = useColors();
  const { t } = useAppTheme();

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.surfaceSecondary, borderColor: isActive ? theme.accent : colors.border }]}>
      <MiniCalendarPreview theme={theme} />

      <View style={cardStyles.info}>
        <Text style={[cardStyles.name, { color: colors.text }]}>
          {language === "ar" ? theme.nameAr : theme.name}
        </Text>
        <Text style={[cardStyles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
          {language === "ar" ? theme.descriptionAr : theme.description}
        </Text>

        <View style={cardStyles.colorDots}>
          {Object.values(theme.shiftColors).map((c, i) => (
            <View key={i} style={[cardStyles.dot, { backgroundColor: c }]} />
          ))}
        </View>

        <Pressable
          onPress={onApply}
          style={({ pressed }) => [
            cardStyles.applyBtn,
            {
              backgroundColor: isActive ? colors.border : theme.accent,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {isActive ? (
            <Ionicons name="checkmark-circle" size={16} color={colors.text} />
          ) : (
            <Ionicons name="color-palette" size={16} color="#FFF" />
          )}
          <Text style={[cardStyles.applyText, { color: isActive ? colors.text : "#FFF" }]}>
            {isActive ? t("مفعّل", "Active") : t("تطبيق", "Apply")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ThemeStoreScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t, isDark, language, storeThemeId, applyStoreTheme } = useAppTheme();
  const { playSound } = useSound();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;
  const bgColor = isDark ? "#0D1117" : colors.surface;

  const handleApply = (themeId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (storeThemeId === themeId) {
      playSound("toggle");
      applyStoreTheme(null);
    } else {
      playSound("success");
      applyStoreTheme(themeId);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { playSound("navigate"); router.back(); }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("متجر الثيمات", "Theme Store")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="sparkles" size={18} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("ثيمات التقويم", "Calendar Themes")}
          </Text>
        </View>
        <Text style={[styles.sectionSubtext, { color: colors.textSecondary }]}>
          {t("اختر ثيم لتغيير مظهر التقويم بالكامل", "Choose a theme to change the entire calendar look")}
        </Text>

        {STORE_THEMES.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={storeThemeId === theme.id}
            onApply={() => handleApply(theme.id)}
            language={language}
          />
        ))}

        {storeThemeId && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              playSound("toggle");
              applyStoreTheme(null);
            }}
            style={({ pressed }) => [
              styles.resetBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
            <Text style={[styles.resetText, { color: colors.textSecondary }]}>
              {t("إعادة للافتراضي", "Reset to Default")}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  calendar: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
  },
  calHeader: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  calMonth: {
    fontFamily: "Cairo_700Bold",
    fontSize: 12,
  },
  dayHeaders: {
    flexDirection: "row",
    paddingVertical: 3,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: "center",
  },
  dayHeaderText: {
    fontSize: 8,
    fontFamily: "Cairo_600SemiBold",
  },
  weekRow: {
    flexDirection: "row",
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
    marginHorizontal: 1,
    marginVertical: 1,
  },
  dayNum: {
    fontSize: 7,
    fontFamily: "Cairo_600SemiBold",
  },
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    marginBottom: 16,
  },
  info: {
    padding: 16,
    gap: 8,
  },
  name: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  desc: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  colorDots: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  applyText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 22,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  sectionSubtext: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    marginBottom: 16,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  resetText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
});
