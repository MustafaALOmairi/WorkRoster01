import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/lib/useColors";
import { useAppTheme } from "@/lib/ThemeContext";
import { useSound } from "@/lib/SoundContext";

const APP_VERSION = "1.0.0";

export default function AboutScreen() {
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
          {t("حول", "About")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoSection}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.appName, { color: colors.text }]}>
            {t("ورك روستر", "WorkRoster")}
          </Text>
          <Text style={[styles.version, { color: colors.textSecondary }]}>
            {t("الإصدار", "Version")} {APP_VERSION}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="code-slash-outline" size={22} color={colors.accent} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>
                {t("المطور", "Developer")}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                ولد نيوتن
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={22} color={colors.accent} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>
                {t("الإصدار", "Version")}
              </Text>
              <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                {APP_VERSION}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t("دعم التطبيق", "Support the App")}
        </Text>
        <Pressable
          onPress={() => {
            playSound("tap");
            Linking.openURL("https://buymeacoffee.com/mustafahilc");
          }}
          style={[styles.donateBtn, { backgroundColor: "#FFDD00" }]}
        >
          <Ionicons name="heart" size={20} color="#000" />
          <Text style={styles.donateBtnText}>
            {t("تبرع لدعم التطبيق", "Donate to support the app")}
          </Text>
        </Pressable>

        <Text style={[styles.copyright, { color: colors.textSecondary }]}>
          {"\u00A9"} 2026 ولد نيوتن
        </Text>
        <Text style={[styles.copyright, { color: colors.textSecondary }]}>
          {t("جميع الحقوق محفوظة", "All rights reserved")}
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  logoSection: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 36,
  },
  appName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
  },
  version: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  infoText: { gap: 2 },
  infoLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  infoValue: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
  },
  sectionLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    paddingTop: 28,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  donateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  donateBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#000",
  },
  copyright: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
