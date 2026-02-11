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
import Colors from "@/constants/colors";
import { useShiftConfig } from "@/lib/ShiftContext";
import {
  ShiftType,
  SHIFT_DEFINITIONS,
  PRESET_PATTERNS,
  MONTH_NAMES_AR,
  getShiftForDate,
  getDaysInMonth,
  parseDate,
  formatDate,
} from "@/lib/shift-utils";

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const d = parseDate(value);
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  const adjustDay = (delta: number) => {
    const newDate = new Date(year, month, day + delta);
    onChange(formatDate(newDate));
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.datePickerRow}>
      <Pressable onPress={() => adjustDay(1)} hitSlop={8}>
        <Ionicons name="add-circle-outline" size={28} color={Colors.accent} />
      </Pressable>
      <Text style={styles.datePickerValue}>
        {day} {MONTH_NAMES_AR[month]} {year}
      </Text>
      <Pressable onPress={() => adjustDay(-1)} hitSlop={8}>
        <Ionicons name="remove-circle-outline" size={28} color={Colors.accent} />
      </Pressable>
    </View>
  );
}

function PatternPreview({ pattern }: { pattern: ShiftType[] }) {
  return (
    <View style={styles.patternPreview}>
      {pattern.map((shift, i) => (
        <View
          key={i}
          style={[
            styles.patternDot,
            { backgroundColor: Colors.shifts[shift].color },
          ]}
        />
      ))}
    </View>
  );
}

function CustomPatternEditor({
  pattern,
  onChange,
}: {
  pattern: ShiftType[];
  onChange: (p: ShiftType[]) => void;
}) {
  const shiftTypes: ShiftType[] = ["morning", "evening", "night", "rest"];

  const addShift = (type: ShiftType) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange([...pattern, type]);
  };

  const removeLastShift = () => {
    if (pattern.length > 1) {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(pattern.slice(0, -1));
    }
  };

  return (
    <View style={styles.customEditor}>
      <View style={styles.customPatternDisplay}>
        {pattern.map((shift, i) => (
          <View
            key={i}
            style={[
              styles.customPatternChip,
              { backgroundColor: Colors.shifts[shift].bg },
            ]}
          >
            <Text
              style={[
                styles.customPatternChipText,
                { color: Colors.shifts[shift].color },
              ]}
            >
              {SHIFT_DEFINITIONS[shift].labelAr}
            </Text>
          </View>
        ))}
        {pattern.length > 1 && (
          <Pressable onPress={removeLastShift} style={styles.removeChipBtn}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>
      <View style={styles.addShiftRow}>
        {shiftTypes.map((type) => (
          <Pressable
            key={type}
            onPress={() => addShift(type)}
            style={[
              styles.addShiftBtn,
              { backgroundColor: Colors.shifts[type].color },
            ]}
          >
            <Ionicons name="add" size={14} color="#FFF" />
            <Text style={styles.addShiftBtnText}>
              {SHIFT_DEFINITIONS[type].labelAr}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { config, updateConfig } = useShiftConfig();
  const [showCustom, setShowCustom] = useState(config.patternId === "custom");

  const selectPreset = useCallback(
    (preset: (typeof PRESET_PATTERNS)[0]) => {
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateConfig({
        pattern: preset.shifts,
        patternId: preset.id,
      });
      setShowCustom(false);
    },
    [updateConfig]
  );

  const enableCustom = useCallback(() => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateConfig({ patternId: "custom" });
    setShowCustom(true);
  }, [updateConfig]);

  const exportPDF = useCallback(async () => {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const startDate = parseDate(config.startDate);
    const now = new Date();
    const year = now.getFullYear();

    let tableRows = "";
    for (let m = 0; m < 12; m++) {
      const days = getDaysInMonth(year, m);
      for (let d = 1; d <= days; d++) {
        const date = new Date(year, m, d);
        const shift = getShiftForDate(date, startDate, config.pattern);
        const def = SHIFT_DEFINITIONS[shift];
        const color = Colors.shifts[shift].color;
        tableRows += `<tr>
          <td>${d} ${MONTH_NAMES_AR[m]} ${year}</td>
          <td style="color:${color};font-weight:bold">${def.labelAr}</td>
          <td>${def.startTime || "-"}</td>
          <td>${def.endTime || "-"}</td>
        </tr>`;
      }
    }

    const html = `
      <html dir="rtl">
      <head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; color: #0F2027; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #0F2027; color: white; padding: 8px; text-align: right; }
        td { padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; }
        tr:nth-child(even) { background: #f9f9f9; }
      </style></head>
      <body>
        <h1>جدول الشفتات ${year}</h1>
        <table>
          <thead><tr><th>التاريخ</th><th>الشفت</th><th>البداية</th><th>النهاية</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body></html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "مشاركة جدول الشفتات",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("تم الحفظ", "تم حفظ الملف بنجاح");
      }
    } catch (e) {
      Alert.alert("خطأ", "حدث خطأ أثناء التصدير");
    }
  }, [config]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <Text style={styles.title}>الإعدادات</Text>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="تاريخ بداية الدورة" />
        <View style={styles.card}>
          <DatePicker
            value={config.startDate}
            onChange={(d) => updateConfig({ startDate: d })}
          />
        </View>

        <SectionHeader title="نظام الدوام" />
        <View style={styles.card}>
          {PRESET_PATTERNS.map((preset) => (
            <Pressable
              key={preset.id}
              onPress={() => selectPreset(preset)}
              style={[
                styles.presetRow,
                config.patternId === preset.id && styles.presetRowActive,
              ]}
            >
              <View style={styles.presetInfo}>
                <Text
                  style={[
                    styles.presetName,
                    config.patternId === preset.id && styles.presetNameActive,
                  ]}
                >
                  {preset.nameAr}
                </Text>
                <PatternPreview pattern={preset.shifts} />
              </View>
              {config.patternId === preset.id && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={Colors.accent}
                />
              )}
            </Pressable>
          ))}
          <Pressable
            onPress={enableCustom}
            style={[
              styles.presetRow,
              styles.presetRowLast,
              showCustom && styles.presetRowActive,
            ]}
          >
            <View style={styles.presetInfo}>
              <Text
                style={[
                  styles.presetName,
                  showCustom && styles.presetNameActive,
                ]}
              >
                مخصص
              </Text>
            </View>
            {showCustom && (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={Colors.accent}
              />
            )}
          </Pressable>
        </View>

        {showCustom && (
          <>
            <SectionHeader title="تعديل النمط المخصص" />
            <View style={styles.card}>
              <CustomPatternEditor
                pattern={config.pattern}
                onChange={(p) => updateConfig({ pattern: p })}
              />
            </View>
          </>
        )}

        <SectionHeader title="تصدير ومشاركة" />
        <View style={styles.card}>
          <Pressable onPress={exportPDF} style={styles.exportRow}>
            <Text style={styles.exportText}>تصدير PDF ومشاركة</Text>
            <Ionicons name="share-outline" size={22} color={Colors.accent} />
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={Colors.textSecondary}
          />
          <Text style={styles.infoText}>
            اختر تاريخ بداية الدورة ونظام الدوام وسيتم حساب جميع الشفتات تلقائيا
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 28,
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    textAlign: "right",
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    textAlign: "right",
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    overflow: "hidden",
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
    color: Colors.text,
  },
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  presetRowLast: {
    borderBottomWidth: 0,
  },
  presetRowActive: {
    backgroundColor: "#E8F0FE",
  },
  presetInfo: {
    gap: 6,
  },
  presetName: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  presetNameActive: {
    color: Colors.primary,
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
  customEditor: {
    padding: 16,
    gap: 12,
  },
  customPatternDisplay: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  customPatternChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  customPatternChipText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
  },
  removeChipBtn: {
    padding: 2,
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
    color: Colors.text,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
  },
  infoText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    textAlign: "right",
    lineHeight: 20,
  },
});
