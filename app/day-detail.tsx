import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Platform,
  Switch,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/lib/useColors";
import { useAppTheme } from "@/lib/ThemeContext";
import { useShiftConfig } from "@/lib/ShiftContext";
import { useNotes } from "@/lib/NotesContext";
import { useSound } from "@/lib/SoundContext";
import {
  ShiftType,
  SHIFT_DEFINITIONS,
  getShiftForDate,
  parseDate,
  MONTH_NAMES_AR,
  MONTH_NAMES_EN,
  DAY_FULL_AR,
  DAY_FULL_EN,
} from "@/lib/shift-utils";

export default function DayDetailSheet() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const colors = useColors();
  const { language, t } = useAppTheme();
  const { config } = useShiftConfig();
  const { getNote, setNote, deleteNote, requestNotificationPermission } = useNotes();
  const { playSound } = useSound();

  const existingNote = date ? getNote(date) : undefined;
  const [noteText, setNoteText] = useState(existingNote?.text || "");
  const [reminderEnabled, setReminderEnabled] = useState(existingNote?.reminderEnabled || false);
  const [reminderTime, setReminderTime] = useState(existingNote?.reminderTime || "08:00");

  useEffect(() => {
    if (date) {
      const n = getNote(date);
      setNoteText(n?.text || "");
      setReminderEnabled(n?.reminderEnabled || false);
      setReminderTime(n?.reminderTime || "08:00");
    }
  }, [date]);

  if (!date) return null;

  const d = parseDate(date);
  const startDate = parseDate(config.startDate);
  const shiftType = getShiftForDate(d, startDate, config.pattern);
  const def = SHIFT_DEFINITIONS[shiftType];
  const shiftColor = colors.shifts[shiftType];

  const customTimes = config.customShiftTimes;
  let displayStart = def.startTime;
  let displayEnd = def.endTime;
  if (shiftType !== "rest" && customTimes[shiftType as "morning" | "evening" | "night"]) {
    displayStart = customTimes[shiftType as "morning" | "evening" | "night"].start;
    displayEnd = customTimes[shiftType as "morning" | "evening" | "night"].end;
  }

  const monthNames = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const dayFullNames = language === "ar" ? DAY_FULL_AR : DAY_FULL_EN;
  const dayName = dayFullNames[d.getDay()];
  const formattedDate = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;

  const holidays = config.holidays.filter((h) => date >= h.startDate && date <= h.endDate);

  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    morning: "sunny",
    evening: "partly-sunny",
    night: "moon",
    rest: "leaf",
  };

  const parsedHour = parseInt(reminderTime.split(":")[0], 10) || 0;
  const parsedMinute = parseInt(reminderTime.split(":")[1], 10) || 0;

  const adjustHour = (delta: number) => {
    const newHour = ((parsedHour + delta) % 24 + 24) % 24;
    setReminderTime(`${String(newHour).padStart(2, "0")}:${String(parsedMinute).padStart(2, "0")}`);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const adjustMinute = (delta: number) => {
    const newMinute = ((parsedMinute + delta) % 60 + 60) % 60;
    setReminderTime(`${String(parsedHour).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveNote = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playSound("success");
    if (noteText.trim() || reminderEnabled) {
      setNote(date, {
        text: noteText.trim(),
        reminderEnabled,
        reminderTime,
      });
    } else {
      deleteNote(date);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.iconCircle, { backgroundColor: shiftColor.bg }]}>
          <Ionicons name={iconMap[shiftType]} size={36} color={shiftColor.color} />
        </View>

        <Text style={[styles.dayName, { color: colors.text }]}>{dayName}</Text>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formattedDate}</Text>

        {holidays.map((h) => (
          <View key={h.id} style={[styles.holidayBanner, { backgroundColor: (h.color || "#FF9800") + "20" }]}>
            <Ionicons name="star" size={16} color={h.color || "#FF9800"} />
            <Text style={[styles.holidayBannerText, { color: h.color || "#FF9800" }]}>{h.name}</Text>
          </View>
        ))}

        <View style={[styles.shiftCard, { backgroundColor: shiftColor.bg }]}>
          <Text style={[styles.shiftLabel, { color: shiftColor.color }]}>
            {language === "ar" ? def.labelAr : def.label}
          </Text>
          {displayStart ? (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color={shiftColor.color} />
              <Text style={[styles.timeText, { color: shiftColor.color }]}>
                {displayStart} - {displayEnd}
              </Text>
            </View>
          ) : (
            <Text style={[styles.restText, { color: shiftColor.color }]}>
              {t("يوم راحة", "Day Off")}
            </Text>
          )}
        </View>

        <View style={[styles.notesSection, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <View style={styles.noteHeader}>
            <Ionicons name="document-text-outline" size={18} color={colors.text} />
            <Text style={[styles.noteTitle, { color: colors.text }]}>
              {t("ملاحظات", "Notes")}
            </Text>
          </View>
          <TextInput
            style={[
              styles.noteInput,
              {
                backgroundColor: colors.surfaceTertiary,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={noteText}
            onChangeText={setNoteText}
            placeholder={t("اكتب ملاحظة...", "Write a note...")}
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
            textAlign={language === "ar" ? "right" : "left"}
          />
        </View>

        <View style={[styles.reminderSection, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={styles.reminderRow}>
            <View style={styles.reminderLeft}>
              <Ionicons name="notifications-outline" size={18} color={colors.text} />
              <Text style={[styles.reminderLabel, { color: colors.text }]}>
                {t("تذكير", "Reminder")}
              </Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={async (val) => {
                if (val) {
                  const granted = await requestNotificationPermission();
                  if (!granted && Platform.OS !== "web") {
                    return;
                  }
                }
                setReminderEnabled(val);
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                playSound("toggle");
              }}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFF"
            />
          </View>
          {reminderEnabled && (
            <View style={styles.timePickerSection}>
              <Text style={[styles.timePickerLabel, { color: colors.textSecondary }]}>
                {t("وقت التذكير", "Reminder Time")}
              </Text>
              <View style={styles.timePickerRow}>
                <View style={styles.timePickerUnit}>
                  <Pressable onPress={() => adjustHour(1)} hitSlop={8}>
                    <Ionicons name="add-circle-outline" size={28} color={colors.accent} />
                  </Pressable>
                  <Text style={[styles.timePickerValue, { color: colors.text }]}>
                    {String(parsedHour).padStart(2, "0")}
                  </Text>
                  <Pressable onPress={() => adjustHour(-1)} hitSlop={8}>
                    <Ionicons name="remove-circle-outline" size={28} color={colors.accent} />
                  </Pressable>
                  <Text style={[styles.timePickerUnitLabel, { color: colors.textSecondary }]}>
                    {t("ساعة", "Hour")}
                  </Text>
                </View>
                <Text style={[styles.timePickerColon, { color: colors.text }]}>:</Text>
                <View style={styles.timePickerUnit}>
                  <Pressable onPress={() => adjustMinute(1)} hitSlop={8}>
                    <Ionicons name="add-circle-outline" size={28} color={colors.accent} />
                  </Pressable>
                  <Text style={[styles.timePickerValue, { color: colors.text }]}>
                    {String(parsedMinute).padStart(2, "0")}
                  </Text>
                  <Pressable onPress={() => adjustMinute(-1)} hitSlop={8}>
                    <Ionicons name="remove-circle-outline" size={28} color={colors.accent} />
                  </Pressable>
                  <Text style={[styles.timePickerUnitLabel, { color: colors.textSecondary }]}>
                    {t("دقيقة", "Minute")}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <Pressable
          onPress={handleSaveNote}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="checkmark" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>{t("حفظ", "Save")}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    alignItems: "center",
    padding: 24,
    gap: 12,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  dayName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    textAlign: "center",
  },
  dateText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  holidayBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    width: "100%",
  },
  holidayBannerText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: "#FF9800",
  },
  shiftCard: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  shiftLabel: {
    fontFamily: "Cairo_700Bold",
    fontSize: 22,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 16,
  },
  restText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 15,
  },
  notesSection: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noteTitle: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
  },
  noteInput: {
    width: "100%",
    minHeight: 80,
    borderRadius: 10,
    padding: 12,
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    borderWidth: 1,
    lineHeight: 22,
  },
  reminderSection: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reminderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reminderLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
  },
  reminderInfo: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
  },
  timePickerSection: {
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  timePickerLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
  },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  timePickerUnit: {
    alignItems: "center",
    gap: 4,
  },
  timePickerValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 28,
  },
  timePickerColon: {
    fontFamily: "Cairo_700Bold",
    fontSize: 28,
    marginBottom: 24,
  },
  timePickerUnitLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  saveBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
});
