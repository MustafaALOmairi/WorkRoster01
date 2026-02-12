import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { useColors } from "@/lib/useColors";
import { useAppTheme, AVAILABLE_COLORS, ShiftColors } from "@/lib/ThemeContext";
import { useShiftConfig, Holiday } from "@/lib/ShiftContext";
import {
  ShiftType,
  SHIFT_DEFINITIONS,
  MONTH_NAMES_AR,
  MONTH_NAMES_EN,
  getShiftForDate,
  parseDate,
  formatDate,
} from "@/lib/shift-utils";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useSound } from "@/lib/SoundContext";

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>;
}

function DatePicker({
  value,
  onChange,
  colors,
  language,
  label,
}: {
  value: string;
  onChange: (date: string) => void;
  colors: ReturnType<typeof useColors>;
  language: string;
  label?: string;
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
      {label && <Text style={[styles.datePickerLabel, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={styles.datePickerControls}>
        <Pressable onPress={() => adjustDay(-1)} hitSlop={8}>
          <Ionicons name="remove-circle-outline" size={28} color={colors.accent} />
        </Pressable>
        <Text style={[styles.datePickerValue, { color: colors.text }]}>
          {day} {monthNames[month]} {year}
        </Text>
        <Pressable onPress={() => adjustDay(1)} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={28} color={colors.accent} />
        </Pressable>
      </View>
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
  const [startDateVal, setStartDateVal] = useState(formatDate(new Date()));
  const [endDateVal, setEndDateVal] = useState(formatDate(new Date()));
  const [holidayColor, setHolidayColor] = useState("#FF9800");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const t = (ar: string, en: string) => language === "ar" ? ar : en;

  const handleAdd = () => {
    if (!name.trim()) return;
    const finalEnd = endDateVal < startDateVal ? startDateVal : endDateVal;
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    onAdd({ id, name: name.trim(), startDate: startDateVal, endDate: finalEnd, color: holidayColor });
    setName("");
    setStartDateVal(formatDate(new Date()));
    setEndDateVal(formatDate(new Date()));
    setHolidayColor("#FF9800");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {t("إضافة إجازة", "Add Holiday")}
          </Text>
          <TextInput
            style={[styles.holidayInput, { color: colors.text, backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder={t("اسم الإجازة...", "Holiday name...")}
            placeholderTextColor={colors.textSecondary}
            textAlign={language === "ar" ? "right" : "left"}
          />
          <DatePicker value={startDateVal} onChange={setStartDateVal} colors={colors} language={language} label={t("من", "From")} />
          <DatePicker value={endDateVal} onChange={setEndDateVal} colors={colors} language={language} label={t("إلى", "To")} />
          <View style={styles.holidayColorSection}>
            <Text style={[styles.holidayColorLabel, { color: colors.textSecondary }]}>
              {t("اللون", "Color")}
            </Text>
            <Pressable onPress={() => setShowColorPicker(!showColorPicker)} style={[styles.holidayColorBtn, { borderColor: colors.border }]}>
              <View style={[styles.holidayColorSwatch, { backgroundColor: holidayColor }]} />
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </Pressable>
          </View>
          {showColorPicker && (
            <View style={styles.colorGrid}>
              {AVAILABLE_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => { setHolidayColor(c); setShowColorPicker(false); }}
                  style={[styles.colorGridItem, { backgroundColor: c }, holidayColor === c && styles.colorGridItemActive]}
                >
                  {holidayColor === c && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </Pressable>
              ))}
            </View>
          )}
          <Pressable onPress={handleAdd} style={[styles.holidayAddBtn, { backgroundColor: colors.accent }]}>
            <Ionicons name="checkmark" size={18} color="#FFF" />
            <Text style={styles.holidayAddBtnText}>{t("إضافة", "Add")}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ExportDateRangeModal({
  visible,
  onClose,
  onExport,
  colors,
  language,
}: {
  visible: boolean;
  onClose: () => void;
  onExport: (from: string, to: string) => void;
  colors: ReturnType<typeof useColors>;
  language: string;
}) {
  const now = new Date();
  const yearStart = formatDate(new Date(now.getFullYear(), 0, 1));
  const yearEnd = formatDate(new Date(now.getFullYear(), 11, 31));
  const [fromDate, setFromDate] = useState(yearStart);
  const [toDate, setToDate] = useState(yearEnd);
  const t = (ar: string, en: string) => language === "ar" ? ar : en;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {t("تحديد فترة التصدير", "Select Export Range")}
          </Text>
          <DatePicker value={fromDate} onChange={setFromDate} colors={colors} language={language} label={t("من", "From")} />
          <DatePicker value={toDate} onChange={setToDate} colors={colors} language={language} label={t("إلى", "To")} />
          <Pressable
            onPress={() => { onExport(fromDate, toDate); onClose(); }}
            style={[styles.holidayAddBtn, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="download-outline" size={18} color="#FFF" />
            <Text style={styles.holidayAddBtnText}>{t("تصدير PDF", "Export PDF")}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function CustomizeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const {
    language, setCustomShiftColor, shiftColors, t,
  } = useAppTheme();
  const { config, updateConfig, addHoliday, removeHoliday } = useShiftConfig();
  const { playSound } = useSound();
  const [colorPickerShift, setColorPickerShift] = useState<keyof ShiftColors | null>(null);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [showExportRange, setShowExportRange] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);

  const exportPDF = useCallback(async (fromDateStr: string, toDateStr: string) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playSound("success");
    const startDate = parseDate(config.startDate);
    const fromDate = parseDate(fromDateStr);
    const toDate = parseDate(toDateStr);
    const monthNames = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;
    const times = config.customShiftTimes;

    let tableRows = "";
    const current = new Date(fromDate);
    while (current <= toDate) {
      const shift = getShiftForDate(current, startDate, config.pattern);
      const def = SHIFT_DEFINITIONS[shift];
      const color = colors.shifts[shift].color;
      const label = language === "ar" ? def.labelAr : def.label;
      const st = shift === "rest" ? "-" : (times[shift as "morning"|"evening"|"night"]?.start || def.startTime || "-");
      const et = shift === "rest" ? "-" : (times[shift as "morning"|"evening"|"night"]?.end || def.endTime || "-");
      const dayStr = `${current.getDate()} ${monthNames[current.getMonth()]} ${current.getFullYear()}`;
      tableRows += `<tr><td>${dayStr}</td><td style="color:${color};font-weight:bold">${label}</td><td>${st}</td><td>${et}</td></tr>`;
      current.setDate(current.getDate() + 1);
    }

    const dir = language === "ar" ? "rtl" : "ltr";
    const align = language === "ar" ? "right" : "left";
    const titleText = language === "ar" ? "جدول الشفتات" : "Shift Schedule";
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

  const shareHolidays = useCallback(async () => {
    if (config.holidays.length === 0) {
      Alert.alert(t("لا توجد إجازات", "No Holidays"), t("أضف إجازات أولاً لمشاركتها", "Add holidays first to share them"));
      return;
    }
    setSharingLoading(true);
    try {
      const payload = config.holidays.map((h) => ({
        name: h.name,
        startDate: h.startDate,
        endDate: h.endDate,
        color: h.color,
      }));
      const res = await apiRequest("POST", "/api/holidays/share", { holidays: payload });
      const data = await res.json();
      const baseUrl = getApiUrl();
      const shareUrl = `${baseUrl}import-holidays/${data.id}`;
      try {
        await Clipboard.setStringAsync(shareUrl);
        Alert.alert(
          t("تم النسخ", "Link Copied"),
          t("تم نسخ رابط الإجازات. شاركه مع زملائك", "Holiday link copied. Share it with your colleagues")
        );
      } catch {
        Alert.alert(t("رابط المشاركة", "Share Link"), shareUrl);
      }
    } catch {
      Alert.alert(t("خطأ", "Error"), t("حدث خطأ أثناء المشاركة", "Sharing failed"));
    } finally {
      setSharingLoading(false);
    }
  }, [config.holidays, language]);

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
  const monthNames = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;

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

  const formatDisplayDate = (dateStr: string) => {
    const d = parseDate(dateStr);
    return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: insets.top + webTopInset }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => { playSound("navigate"); router.back(); }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t("تخصيص", "Customize")}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader title={t("تخصيص الألوان", "Customize Colors")} colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary }]}>
          {colorShiftLabels.map((item, idx) => (
            <Pressable
              key={item.key}
              onPress={() => { playSound("tap"); setColorPickerShift(item.key); }}
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
          <CustomPatternEditor
            pattern={config.pattern}
            onChange={(p) => updateConfig({ pattern: p, patternId: "custom" })}
            colors={colors}
            language={language}
          />
        </View>

        <SectionHeader title={t("الإجازات الإضافية", "Extra Holidays")} colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary }]}>
          {config.holidays.length === 0 && (
            <Text style={[styles.noHolidaysText, { color: colors.textSecondary }]}>
              {t("لا توجد إجازات مضافة", "No holidays added")}
            </Text>
          )}
          {config.holidays.map((h) => (
            <View key={h.id} style={[styles.holidayRow, { borderBottomColor: colors.border }]}>
              <View style={styles.holidayInfo}>
                <View style={styles.holidayNameRow}>
                  <View style={[styles.holidayDot, { backgroundColor: h.color }]} />
                  <Text style={[styles.holidayName, { color: colors.text }]}>{h.name}</Text>
                </View>
                <Text style={[styles.holidayDate, { color: colors.textSecondary }]}>
                  {formatDisplayDate(h.startDate)}
                  {h.startDate !== h.endDate ? ` → ${formatDisplayDate(h.endDate)}` : ""}
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
          ))}
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

        {config.holidays.length > 0 && (
          <>
            <View style={{ height: 8 }} />
            <Pressable
              onPress={() => { playSound("success"); shareHolidays(); }}
              disabled={sharingLoading}
              style={[styles.shareBtn, { backgroundColor: colors.surfaceSecondary, opacity: sharingLoading ? 0.6 : 1 }]}
            >
              <Ionicons name="link-outline" size={20} color={colors.accent} />
              <Text style={[styles.shareBtnText, { color: colors.accent }]}>
                {sharingLoading ? t("جاري المشاركة...", "Sharing...") : t("مشاركة الإجازات كرابط", "Share Holidays as Link")}
              </Text>
            </Pressable>
          </>
        )}

        <SectionHeader title={t("تصدير ومشاركة", "Export & Share")} colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary }]}>
          <Pressable onPress={() => { playSound("tap"); setShowExportRange(true); }} style={styles.exportRow}>
            <Text style={[styles.exportText, { color: colors.text }]}>
              {t("تصدير PDF ومشاركة", "Export PDF & Share")}
            </Text>
            <Ionicons name="share-outline" size={22} color={colors.accent} />
          </Pressable>
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

      <ExportDateRangeModal
        visible={showExportRange}
        onClose={() => setShowExportRange(false)}
        onExport={exportPDF}
        colors={colors}
        language={language}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
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
  timeInputWrap: { flex: 1, gap: 4 },
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
    alignItems: "center",
    padding: 12,
    gap: 4,
  },
  datePickerLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
  },
  datePickerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  datePickerValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
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
  holidayNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  holidayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  holidayName: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  holidayDate: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    marginLeft: 18,
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
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  shareBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
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
    gap: 12,
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
  holidayColorSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
  },
  holidayColorLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  holidayColorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  holidayColorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
