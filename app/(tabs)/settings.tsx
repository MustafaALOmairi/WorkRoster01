import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  Image,
  TextInput,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useColors } from "@/lib/useColors";
import { useAppTheme, AVAILABLE_COLORS, ShiftColors } from "@/lib/ThemeContext";
import { useShiftConfig, Holiday } from "@/lib/ShiftContext";
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
        <View key={i} style={[styles.patternDot, { backgroundColor: colors.shifts[shift].color }]} />
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

  const changeFirstShift = (type: ShiftType) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = [...pattern];
    next[0] = type;
    onChange(next);
  };

  return (
    <View style={styles.customEditor}>
      <Text style={[styles.firstDayLabel, { color: colors.textSecondary }]}>
        {language === "ar" ? "اختر نوع أول يوم:" : "First day type:"}
      </Text>
      <View style={styles.firstDayRow}>
        {(["morning", "evening", "night"] as ShiftType[]).map((type) => (
          <Pressable
            key={type}
            onPress={() => changeFirstShift(type)}
            style={[
              styles.firstDayChip,
              {
                backgroundColor: pattern[0] === type ? colors.shifts[type].color : colors.shifts[type].bg,
              },
            ]}
          >
            <Text style={[styles.firstDayChipText, { color: pattern[0] === type ? "#FFF" : colors.shifts[type].color }]}>
              {language === "ar" ? SHIFT_DEFINITIONS[type].labelAr : SHIFT_DEFINITIONS[type].label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.customPatternDisplay}>
        {pattern.map((shift, i) => (
          <View key={i} style={[styles.customPatternChip, { backgroundColor: colors.shifts[shift].bg }]}>
            <Text style={[styles.customPatternChipText, { color: colors.shifts[shift].color }]}>
              {language === "ar" ? SHIFT_DEFINITIONS[shift].labelAr : SHIFT_DEFINITIONS[shift].label}
            </Text>
            {i === 0 ? (
              <Ionicons name="swap-horizontal" size={12} color={colors.shifts[shift].color} />
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

function TimeEditor({
  label,
  startTime,
  endTime,
  onChangeStart,
  onChangeEnd,
  colors,
  language,
}: {
  label: string;
  startTime: string;
  endTime: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  language: string;
}) {
  return (
    <View style={[styles.timeEditorRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.timeEditorLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.timeEditorInputs}>
        <View style={styles.timeInputWrap}>
          <Text style={[styles.timeInputLabel, { color: colors.textSecondary }]}>
            {language === "ar" ? "من" : "From"}
          </Text>
          <TextInput
            style={[styles.timeInput, { color: colors.text, backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}
            value={startTime}
            onChangeText={onChangeStart}
            placeholder="06:00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
        <View style={styles.timeInputWrap}>
          <Text style={[styles.timeInputLabel, { color: colors.textSecondary }]}>
            {language === "ar" ? "إلى" : "To"}
          </Text>
          <TextInput
            style={[styles.timeInput, { color: colors.text, backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}
            value={endTime}
            onChangeText={onChangeEnd}
            placeholder="14:00"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
      </View>
    </View>
  );
}

function ColorPickerModal({
  visible,
  onClose,
  onSelect,
  currentColor,
  shiftLabel,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (color: string) => void;
  currentColor: string;
  shiftLabel: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{shiftLabel}</Text>
          <View style={styles.colorGrid}>
            {AVAILABLE_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => { onSelect(c); onClose(); }}
                style={[
                  styles.colorGridItem,
                  { backgroundColor: c },
                  currentColor === c && styles.colorGridItemActive,
                ]}
              >
                {currentColor === c && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </Pressable>
            ))}
          </View>
          <Pressable onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AddHolidayModal({
  visible,
  onClose,
  onAdd,
  colors,
  language,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (holiday: Holiday) => void;
  colors: ReturnType<typeof useColors>;
  language: string;
}) {
  const [name, setName] = useState("");
  const [dateVal, setDateVal] = useState(formatDate(new Date()));

  const d = parseDate(dateVal);
  const monthNames = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;

  const adjustDay = (delta: number) => {
    const newDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
    setDateVal(formatDate(newDate));
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    onAdd({ id, name: name.trim(), date: dateVal });
    setName("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {language === "ar" ? "إضافة إجازة" : "Add Holiday"}
          </Text>
          <TextInput
            style={[styles.holidayInput, { color: colors.text, backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder={language === "ar" ? "اسم الإجازة..." : "Holiday name..."}
            placeholderTextColor={colors.textSecondary}
            textAlign={language === "ar" ? "right" : "left"}
          />
          <View style={styles.holidayDateRow}>
            <Pressable onPress={() => adjustDay(-1)} hitSlop={8}>
              <Ionicons name="remove-circle-outline" size={24} color={colors.accent} />
            </Pressable>
            <Text style={[styles.holidayDateText, { color: colors.text }]}>
              {d.getDate()} {monthNames[d.getMonth()]} {d.getFullYear()}
            </Text>
            <Pressable onPress={() => adjustDay(1)} hitSlop={8}>
              <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
            </Pressable>
          </View>
          <Pressable onPress={handleAdd} style={[styles.holidayAddBtn, { backgroundColor: colors.accent }]}>
            <Ionicons name="checkmark" size={18} color="#FFF" />
            <Text style={styles.holidayAddBtnText}>
              {language === "ar" ? "إضافة" : "Add"}
            </Text>
          </Pressable>
          <Pressable onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const {
    language, theme, setLanguage, setTheme,
    colorPresetIndex, colorPresets, setColorPreset,
    setCustomShiftColor, shiftColors,
    t,
  } = useAppTheme();
  const { config, updateConfig, addHoliday, removeHoliday } = useShiftConfig();
  const [showCustom, setShowCustom] = useState(config.patternId === "custom");
  const [colorPickerShift, setColorPickerShift] = useState<keyof ShiftColors | null>(null);
  const [showAddHoliday, setShowAddHoliday] = useState(false);

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
    const times = config.customShiftTimes;
    let tableRows = "";
    for (let m = 0; m < 12; m++) {
      const days = getDaysInMonth(year, m);
      for (let d = 1; d <= days; d++) {
        const date = new Date(year, m, d);
        const shift = getShiftForDate(date, startDate, config.pattern);
        const def = SHIFT_DEFINITIONS[shift];
        const color = colors.shifts[shift].color;
        const label = language === "ar" ? def.labelAr : def.label;
        const st = shift === "rest" ? "-" : (times[shift as "morning"|"evening"|"night"]?.start || def.startTime || "-");
        const et = shift === "rest" ? "-" : (times[shift as "morning"|"evening"|"night"]?.end || def.endTime || "-");
        tableRows += `<tr><td>${d} ${monthNames[m]} ${year}</td><td style="color:${color};font-weight:bold">${label}</td><td>${st}</td><td>${et}</td></tr>`;
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

  const updateShiftTime = (shift: "morning" | "evening" | "night", field: "start" | "end", value: string) => {
    const current = config.customShiftTimes;
    updateConfig({
      customShiftTimes: {
        ...current,
        [shift]: { ...current[shift], [field]: value },
      },
    });
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const shiftTimesArr: { key: "morning" | "evening" | "night"; labelAr: string; labelEn: string }[] = [
    { key: "morning", labelAr: "صباحي", labelEn: "Morning" },
    { key: "evening", labelAr: "مسائي", labelEn: "Evening" },
    { key: "night", labelAr: "ليلي", labelEn: "Night" },
  ];

  const colorShiftLabels: { key: keyof ShiftColors; labelAr: string; labelEn: string }[] = [
    { key: "morning", labelAr: "صباحي", labelEn: "Morning" },
    { key: "evening", labelAr: "مسائي", labelEn: "Evening" },
    { key: "night", labelAr: "ليلي", labelEn: "Night" },
    { key: "rest", labelAr: "راحة", labelEn: "Rest" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: insets.top + webTopInset }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t("الإعدادات", "Settings")}</Text>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
                {colorPresetIndex === idx && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
              </View>
            </Pressable>
          ))}
        </View>

        <SectionHeader title={t("تخصيص الألوان يدوياً", "Custom Colors")} colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary }]}>
          {colorShiftLabels.map((item, idx) => (
            <Pressable
              key={item.key}
              onPress={() => setColorPickerShift(item.key)}
              style={[
                styles.customColorRow,
                idx === colorShiftLabels.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={[styles.customColorLabel, { color: colors.text }]}>
                {language === "ar" ? item.labelAr : item.labelEn}
              </Text>
              <View style={styles.customColorRight}>
                <View style={[styles.customColorSwatch, { backgroundColor: shiftColors[item.key] }]} />
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </Pressable>
          ))}
        </View>

        <SectionHeader title={t("أوقات الشفتات", "Shift Times")} colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, padding: 12 }]}>
          {shiftTimesArr.map((item) => (
            <TimeEditor
              key={item.key}
              label={language === "ar" ? item.labelAr : item.labelEn}
              startTime={config.customShiftTimes[item.key].start}
              endTime={config.customShiftTimes[item.key].end}
              onChangeStart={(v) => updateShiftTime(item.key, "start", v)}
              onChangeEnd={(v) => updateShiftTime(item.key, "end", v)}
              colors={colors}
              language={language}
            />
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
              {config.patternId === preset.id && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
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
              <Text style={[styles.presetName, { color: colors.text }]}>{t("مخصص", "Custom")}</Text>
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

        <SectionHeader title={t("الإجازات الإضافية", "Extra Holidays")} colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary }]}>
          {config.holidays.length === 0 && (
            <Text style={[styles.noHolidaysText, { color: colors.textSecondary }]}>
              {t("لا توجد إجازات مضافة", "No holidays added")}
            </Text>
          )}
          {config.holidays.map((h) => {
            const hd = parseDate(h.date);
            const monthN = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;
            return (
              <View key={h.id} style={[styles.holidayRow, { borderBottomColor: colors.border }]}>
                <View style={styles.holidayInfo}>
                  <Text style={[styles.holidayName, { color: colors.text }]}>{h.name}</Text>
                  <Text style={[styles.holidayDate, { color: colors.textSecondary }]}>
                    {hd.getDate()} {monthN[hd.getMonth()]} {hd.getFullYear()}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    removeHoliday(h.id);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={20} color="#E53935" />
                </Pressable>
              </View>
            );
          })}
          <Pressable
            onPress={() => setShowAddHoliday(true)}
            style={[styles.addHolidayBtn, { borderColor: colors.accent }]}
          >
            <Ionicons name="add" size={18} color={colors.accent} />
            <Text style={[styles.addHolidayBtnText, { color: colors.accent }]}>
              {t("إضافة إجازة", "Add Holiday")}
            </Text>
          </Pressable>
        </View>

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

        <View style={styles.logoSection}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>
            جميع الحقوق محفوظة {"\u00A9"}ولد نيوتن 2026
          </Text>
        </View>
      </ScrollView>

      {colorPickerShift && (
        <ColorPickerModal
          visible={true}
          onClose={() => setColorPickerShift(null)}
          onSelect={(c) => setCustomShiftColor(colorPickerShift, c)}
          currentColor={shiftColors[colorPickerShift]}
          shiftLabel={language === "ar"
            ? colorShiftLabels.find((l) => l.key === colorPickerShift)!.labelAr
            : colorShiftLabels.find((l) => l.key === colorPickerShift)!.labelEn}
          colors={colors}
        />
      )}

      <AddHolidayModal
        visible={showAddHoliday}
        onClose={() => setShowAddHoliday(false)}
        onAdd={addHoliday}
        colors={colors}
        language={language}
      />
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
  customColorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  customColorLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  customColorRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customColorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  timeEditorRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  timeEditorLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  timeEditorInputs: {
    flexDirection: "row",
    gap: 12,
  },
  timeInputWrap: {
    flex: 1,
    gap: 4,
  },
  timeInputLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
  },
  timeInput: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: "center",
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
  firstDayLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
  },
  firstDayRow: {
    flexDirection: "row",
    gap: 8,
  },
  firstDayChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  firstDayChipText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
  },
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
  noHolidaysText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
  holidayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  holidayInfo: { gap: 2, flex: 1 },
  holidayName: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  holidayDate: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
  },
  addHolidayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    margin: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed" as const,
  },
  addHolidayBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
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
  logoSection: {
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
    gap: 8,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  copyrightText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  colorGridItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorGridItemActive: {
    borderWidth: 3,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  holidayInput: {
    width: "100%",
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  holidayDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  holidayDateText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  holidayAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
  },
  holidayAddBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#FFF",
  },
});
