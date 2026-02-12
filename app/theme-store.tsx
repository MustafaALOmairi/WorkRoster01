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
import { useColors } from "@/lib/useColors";
import { useAppTheme } from "@/lib/ThemeContext";
import { useSound } from "@/lib/SoundContext";

export default function ThemeStoreScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t, isDark } = useAppTheme();
  const { playSound } = useSound();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const bgColor = isDark ? "#0D1117" : colors.surface;
  const cardBg = isDark ? "#161B22" : colors.surfaceSecondary;

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

      <View style={styles.emptyState}>
        <Ionicons name="storefront-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t("قريباً", "Coming Soon")}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          {t("سيتم إضافة ثيمات جديدة قريباً", "New themes will be added soon")}
        </Text>
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 22,
  },
  emptySubtext: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
  },
});
