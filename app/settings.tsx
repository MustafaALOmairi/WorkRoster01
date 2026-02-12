import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/lib/useColors";
import { useAppTheme } from "@/lib/ThemeContext";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { language, theme, setLanguage, setTheme, t, isDark } = useAppTheme();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const bgColor = isDark ? "#0D1117" : colors.surface;
  const cardBg = isDark ? "#161B22" : colors.surfaceSecondary;

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("الإعدادات", "Settings")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t("اللغة", "Language")}
      </Text>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => { setLanguage("ar"); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.toggleBtn, language === "ar" && { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.toggleBtnText, language === "ar" && { color: "#FFF" }]}>العربية</Text>
          </Pressable>
          <Pressable
            onPress={() => { setLanguage("en"); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.toggleBtn, language === "en" && { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.toggleBtnText, language === "en" && { color: "#FFF" }]}>English</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {t("المظهر", "Appearance")}
      </Text>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => { setTheme("light"); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.toggleBtn, theme === "light" && { backgroundColor: colors.accent }]}
          >
            <Ionicons name="sunny" size={18} color={theme === "light" ? "#FFF" : colors.text} />
            <Text style={[styles.toggleBtnText, theme === "light" && { color: "#FFF" }]}>
              {t("فاتح", "Light")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setTheme("dark"); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.toggleBtn, theme === "dark" && { backgroundColor: colors.accent }]}
          >
            <Ionicons name="moon" size={18} color={theme === "dark" ? "#FFF" : colors.text} />
            <Text style={[styles.toggleBtnText, theme === "dark" && { color: "#FFF" }]}>
              {t("داكن", "Dark")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

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
  sectionLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  toggleRow: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  toggleBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
    color: "#555",
  },
});
