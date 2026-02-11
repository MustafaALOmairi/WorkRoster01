import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useColors } from "@/lib/useColors";
import { useAppTheme } from "@/lib/ThemeContext";
import { useShiftConfig } from "@/lib/ShiftContext";
import {
  ShiftType,
  SHIFT_DEFINITIONS,
  PRESET_PATTERNS,
  MONTH_NAMES_AR,
  MONTH_NAMES_EN,
  getShiftForDate,
  getDaysInMonth,
  parseDate,
  formatDate,
} from "@/lib/shift-utils";

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>;
}

function DatePicker({
  value,
  onChange,
  colors,
  language,
}: {
  value: string;
  onChange: (date: string) => void;
  colors: ReturnType<typeof useColors>;
  language: string;
}) {
  const d = parseDate(value);
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();
  const monthNames = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;

  const adjustDay = (delta: number) => {
    const newDate = new Date(year, month, day + delta);
    onChange(formatDate(newDate));
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.datePickerRow}>
      <Pressable onPress={() => adjustDay(1)} hitSlop={8}>
        <Ionicons name="add-circle-outline" size={28} color={colors.accent} />
      </Pressable>
      <Text style={[styles.datePickerValue, { color: colors.text }]}>
        {day} {monthNames[month]} {year}
      </Text>
      <Pressable onPress={() => adjustDay(-1)} hitSlop={8}>
        <Ionicons name="remove-circle-outline" size={28} color={colors.accent} />
      </Pressable>
    </View>
  );
}

function PatternPreview({ pattern, colors }: { pattern: ShiftType[]; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.patternPreview}>
      {pattern.map((shift, i) => (
        <View
          key={i}
          style={[styles.patternDot, { backgroundColor: colors.shifts[shift].color }]}
        />
      ))}
    </View>
  );
}

function CustomPatternEditor({
  pattern,
  onChange,
  colors,
  language,
}: {
  pattern: ShiftType[];
  onChange: (p: ShiftType[]) => void;
  colors: ReturnType<typeof useColors>;
  language: string;
}) {
  const shiftTypes: ShiftType[] = ["morning", "evening", "night", "rest"];

  const addShift = (type: ShiftType) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange([...pattern, type]);
  };

  const removeShiftAt = (index: number) => {
    if (index === 0) return;
    if (pattern.length <= 1) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = [...pattern];
    next.splice(index, 1);
    onChange(next);
  };

  return (
    <View style={styles.customEditor}>
      <View style={styles.customPatternDisplay}>
        {pattern.map((shift, i) => (
          <View
            key={i}
            style={[
              styles.customPatternChip,
              { backgroundColor: colors.shifts[shift].bg },
            ]}
          >
            <Text
              style={[styles.customPatternChipText, { color: colors.shifts[shift].color }]}
            >
              {language === "ar" ? SHIFT_DEFINITIONS[shift].labelAr : SHIFT_DEFINITIONS[shift].label}
            </Text>
            {i === 0 ? (
              <Ionicons name="lock-closed" size={12} color={colors.shifts[shift].color} />
            ) : (
              <Pressable onPress={() => removeShiftAt(i)} hitSlop={6}>
                <Ionicons name="close-circle" size={16} color={colors.shifts[shift].color} />
              </Pressable>
            )}
          </View>
        ))}
      </View>
      <View style={styles.addShiftRow}>
        {shiftTypes.map((type) => (
          <Pressable
            key={type}
            onPress={() => addShift(type)}
            style={[styles.addShiftBtn, { backgroundColor: colors.shifts[type].color }]}
          >
            <Ionicons name="add" size={14} color="#FFF" />
            <Text style={styles.addShiftBtnText}>
              {language === "ar" ? SHIFT_DEFINITIONS[type].labelAr : SHIFT_DEFINITIONS[type].label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const {
    language, theme, setLanguage, setTheme,
    colorPresetIndex, colorPresets, setColorPreset,
    t,
  } = useAppTheme();
  const { config, updateConfig } = useShiftConfig();
  const [showCustom, setShowCustom] = useState(config.patternId === "custom");

  const selectPreset = useCallback(
    (preset: (typeof PRESET_PATTERNS)[0]) => {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateConfig({ pattern: preset.shifts, patternId: preset.id });
      setShowCustom(false);
    },
    [updateConfig]
  );

  const enableCustom = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateConfig({ patternId: "custom", pattern: ["morning"] });
    setShowCustom(true);
  }, [updateConfig]);

  const exportPDF = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const startDate = parseDate(config.startDate);
    const now = new Date();
    const year = now.getFullYear();
    const monthNames = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;
    let tableRows = "";
    for (let m = 0; m < 12; m++) {
      const days = getDaysInMonth(year, m);
      for (let d = 1; d <= days; d++) {
        const date = new Date(year, m, d);
        const shift = getShiftForDate(date, startDate, config.pattern);
        const def = SHIFT_DEFINITIONS[shift];
        const color = colors.shifts[shift].color;
        const label = language === "ar" ? def.labelAr : def.label;
        tableRows += `<tr><td>${d} ${monthNames[m]} ${year}</td><td style="color:${color};font-weight:bold">${label}</td><td>${def.startTime || "-"}</td><td>${def.endTime || "-"}</td></tr>`;
      }
    }
    const dir = language === "ar" ? "rtl" : "ltr";
    const align = language === "ar" ? "right" : "left";
    const titleText = language === "ar" ? `جدول الشفتات ${year}` : `Shift Schedule ${year}`;
    const headers = language === "ar"
      ? "<th>التاريخ</th><th>الشفت</th><th>البداية</th><th>النهاية</th>"
      : "<th>Date</th><th>Shift</th><th>Start</th><th>End</th>";
    const html = `<html dir="${dir}"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:20px}h1{text-align:center;color:#0F2027}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#0F2027;color:white;padding:8px;text-align:${align}}td{padding:6px 8px;border-bottom:1px solid #eee;text-align:${align}}tr:nth-child(even){background:#f9f9f9}</style></head><body><h1>${titleText}</h1><table><thead><tr>${headers}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      } else {
        Alert.alert(t("تم الحفظ", "Saved"), t("تم حفظ الملف بنجاح", "File saved successfully"));
      }
    } catch {
      Alert.alert(t("خطأ", "Error"), t("حدث خطأ أثناء التصدير", "Export failed"));
    }
  }, [config, language, colors]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: insets.top + webTopInset }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t("الإعدادات", "Settings")}</Text>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title={t("اللغة", "Language")} colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary }]}>
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

        <SectionHeader title={t("المظهر", "Theme")} colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary }]}>
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

        <SectionHeader title={t("ألوان الشفتات", "Shift Colors")} colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary }]}>
          {colorPresets.map((preset, idx) => (
            <Pressable
              key={idx}
              onPress={() => { setColorPreset(idx); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[
                styles.colorPresetRow,
                idx === colorPresets.length - 1 && { borderBottomWidth: 0 },
                colorPresetIndex === idx && { backgroundColor: colors.surfaceTertiary },
              ]}
            >
              <Text style={[styles.colorPresetName, { color: colors.text }]}>
                {language === "ar" ? preset.nameAr : preset.name}
              </Text>
              <View style={styles.colorPresetDots}>
                <View style={[styles.colorDot, { backgroundColor: preset.colors.morning }]} />
                <View style={[styles.colorDot, { backgroundColor: preset.colors.evening }]} />
                <View style={[styles.colorDot, { backgroundColor: preset.colors.night }]} />
                <View style={[styles.colorDot, { backgroundColor: preset.colors.rest }]} />
                {colorPresetIndex === idx && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                )}
              </View>
            </Pressable>
          ))}
        </View>

        <SectionHeader title={t("تاريخ بداية الدورة", "Cycle Start Date")} colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary }]}>
          <DatePicker
            value={config.startDate}
            onChange={(d) => updateConfig({ startDate: d })}
            colors={colors}
            language={language}
          />
        </View>

        <SectionHeader title={t("نظام الدوام", "Rotation System")} colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary }]}>
          {PRESET_PATTERNS.map((preset) => (
            <Pressable
              key={preset.id}
              onPress={() => selectPreset(preset)}
              style={[
                styles.presetRow,
                config.patternId === preset.id && { backgroundColor: colors.surfaceTertiary },
              ]}
            >
              <View style={styles.presetInfo}>
                <Text style={[styles.presetName, { color: colors.text }]}>
                  {language === "ar" ? preset.nameAr : preset.name}
                </Text>
                <PatternPreview pattern={preset.shifts} colors={colors} />
              </View>
              {config.patternId === preset.id && (
                <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
              )}
            </Pressable>
          ))}
          <Pressable
            onPress={enableCustom}
            style={[
              styles.presetRow,
              { borderBottomWidth: 0 },
              showCustom && { backgroundColor: colors.surfaceTertiary },
            ]}
          >
            <View style={styles.presetInfo}>
              <Text style={[styles.presetName, { color: colors.text }]}>
                {t("مخصص", "Custom")}
              </Text>
            </View>
            {showCustom && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
          </Pressable>
        </View>

        {showCustom && (
          <>
            <SectionHeader title={t("تعديل النمط المخصص", "Edit Custom Pattern")} colors={colors} />
            <View style={[styles.card, { backgroundColor: colors.surfaceSecondary }]}>
              <CustomPatternEditor
                pattern={config.pattern}
                onChange={(p) => updateConfig({ pattern: p })}
                colors={colors}
                language={language}
              />
            </View>
          </>
        )}

        <SectionHeader title={t("تصدير ومشاركة", "Export & Share")} colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary }]}>
          <Pressable onPress={exportPDF} style={styles.exportRow}>
            <Text style={[styles.exportText, { color: colors.text }]}>
              {t("تصدير PDF ومشاركة", "Export PDF & Share")}
            </Text>
            <Ionicons name="share-outline" size={22} color={colors.accent} />
          </Pressable>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surfaceTertiary }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t(
              "اختر تاريخ بداية الدورة ونظام الدوام وسيتم حساب جميع الشفتات تلقائيا",
              "Choose the cycle start date and rotation system, and all shifts will be calculated automatically"
            )}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  scrollView: { flex: 1 },
  sectionHeader: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    paddingHorizontal: 24,
    paddingTop: 20,
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
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: "#555",
  },
  colorPresetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  colorPresetName: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  colorPresetDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  datePickerValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  presetInfo: { gap: 6 },
  presetName: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
  },
  patternPreview: {
    flexDirection: "row",
    gap: 4,
  },
  patternDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  customEditor: { padding: 16, gap: 12 },
  customPatternDisplay: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  customPatternChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  customPatternChipText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
  },
  addShiftRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  addShiftBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addShiftBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#FFF",
  },
  exportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  exportText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
  },
  infoText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
});
