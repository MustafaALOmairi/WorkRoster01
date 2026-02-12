import React, { useState, useCallback } from "react";
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
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { useColors } from "@/lib/useColors";
import { useAppTheme } from "@/lib/ThemeContext";
import { useShiftConfig } from "@/lib/ShiftContext";
import { useNotes } from "@/lib/NotesContext";
import {
  ShiftType,
  SHIFT_DEFINITIONS,
  getShiftForDate,
  getDaysInMonth,
  getFirstDayOfMonth,
  MONTH_NAMES_AR,
  MONTH_NAMES_EN,
  DAY_FULL_AR,
  DAY_FULL_EN,
  parseDate,
  formatDate,
} from "@/lib/shift-utils";

function ShiftBadge({ type, colors, lang }: { type: ShiftType; colors: ReturnType<typeof useColors>; lang: string }) {
  const def = SHIFT_DEFINITIONS[type];
  const shiftColor = colors.shifts[type];
  return (
    <View style={[styles.shiftBadge, { backgroundColor: shiftColor.color }]}>
      <Text style={styles.shiftBadgeText}>
        {lang === "ar" ? def.labelAr : def.label}
      </Text>
    </View>
  );
}

interface CalendarDayCellProps {
  day: number;
  shiftType: ShiftType;
  isToday: boolean;
  date: Date;
  colors: ReturnType<typeof useColors>;
  hasNote: boolean;
  isHoliday: boolean;
}

function CalendarDayCell({ day, shiftType, isToday, date, colors, hasNote, isHoliday }: CalendarDayCellProps) {
  const shiftColor = colors.shifts[shiftType];

  const dateParam = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/day-detail", params: { date: dateParam } });
  };

  const handleLongPress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({ pathname: "/day-detail", params: { date: dateParam } });
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.dayCell,
        { backgroundColor: isHoliday ? "#FFF3E0" : shiftColor.bg, opacity: pressed ? 0.7 : 1 },
        isToday && { borderWidth: 2, borderColor: colors.accent },
        isHoliday && { borderWidth: 1, borderColor: "#FF9800" },
      ]}
    >
      <Text
        style={[
          styles.dayNumber,
          { color: isHoliday ? "#FF9800" : shiftColor.color },
          isToday && styles.todayText,
        ]}
      >
        {day}
      </Text>
      <View style={styles.dotRow}>
        <View style={[styles.shiftDot, { backgroundColor: shiftColor.color }]} />
        {hasNote && <View style={[styles.noteDot, { backgroundColor: colors.accent }]} />}
        {isHoliday && <View style={[styles.noteDot, { backgroundColor: "#FF9800" }]} />}
      </View>
    </Pressable>
  );
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { language, t } = useAppTheme();
  const { config, isLoaded } = useShiftConfig();
  const { notes } = useNotes();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const monthNames = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const dayFullNames = language === "ar" ? DAY_FULL_AR : DAY_FULL_EN;

  const goToPrevMonth = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  }, [currentMonth]);

  const goToToday = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  }, []);

  if (!isLoaded) return null;

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const startDate = parseDate(config.startDate);

  const holidayDates = new Set(config.holidays.map((h) => h.date));

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) weeks.push(calendarDays.slice(i, i + 7));

  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
  const todayShift = getShiftForDate(today, startDate, config.pattern);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: insets.top + webTopInset }]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={[styles.todayCard, { backgroundColor: colors.surfaceSecondary }]}>
          <View style={styles.todayCardLeft}>
            <Text style={[styles.todayLabel, { color: colors.textSecondary }]}>
              {t("اليوم", "Today")}
            </Text>
            <Text style={[styles.todayDate, { color: colors.text }]}>
              {today.getDate()} {monthNames[today.getMonth()]}
            </Text>
          </View>
          <ShiftBadge type={todayShift} colors={colors} lang={language} />
        </View>
      </Animated.View>

      <View style={styles.monthNav}>
        <Pressable onPress={language === "ar" ? goToNextMonth : goToPrevMonth} hitSlop={12}>
          <Ionicons name={language === "ar" ? "chevron-forward" : "chevron-back"} size={24} color={colors.primary} />
        </Pressable>
        <Pressable onPress={goToToday}>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {monthNames[currentMonth]} {currentYear}
          </Text>
        </Pressable>
        <Pressable onPress={language === "ar" ? goToPrevMonth : goToNextMonth} hitSlop={12}>
          <Ionicons name={language === "ar" ? "chevron-back" : "chevron-forward"} size={24} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.legend}>
        {(["morning", "evening", "night", "rest"] as ShiftType[]).map((type) => (
          <View key={type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.shifts[type].color }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              {language === "ar" ? SHIFT_DEFINITIONS[type].labelAr : SHIFT_DEFINITIONS[type].label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.calendarScroll}
        contentContainerStyle={[styles.calendarContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.weekDaysRow}>
          {dayFullNames.map((name) => (
            <View key={name} style={styles.weekDayCell}>
              <Text style={[styles.weekDayText, { color: colors.textSecondary }]}>{name}</Text>
            </View>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (day === null) return <View key={di} style={styles.emptyCell} />;
              const cellDate = new Date(currentYear, currentMonth, day);
              const shiftType = getShiftForDate(cellDate, startDate, config.pattern);
              const dateKey = formatDate(cellDate);
              const hasNote = !!notes[dateKey]?.text;
              const isHoliday = holidayDates.has(dateKey);
              return (
                <CalendarDayCell
                  key={di}
                  day={day}
                  shiftType={shiftType}
                  isToday={isCurrentMonth && day === today.getDate()}
                  date={cellDate}
                  colors={colors}
                  hasNote={hasNote}
                  isHoliday={isHoliday}
                />
              );
            })}
          </View>
        ))}

        {!isCurrentMonth && (
          <Pressable onPress={goToToday} style={styles.goTodayButton}>
            <Ionicons name="today-outline" size={18} color={colors.accent} />
            <Text style={[styles.goTodayText, { color: colors.accent }]}>
              {t("العودة لليوم", "Go to Today")}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
  },
  todayCardLeft: { gap: 2 },
  todayLabel: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  todayDate: { fontFamily: "Cairo_700Bold", fontSize: 20 },
  shiftBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  shiftBadgeText: { fontFamily: "Cairo_600SemiBold", fontSize: 13, color: "#FFF" },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  monthTitle: { fontFamily: "Cairo_700Bold", fontSize: 18 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: "Cairo_400Regular", fontSize: 11 },
  calendarScroll: { flex: 1 },
  calendarContent: { paddingHorizontal: 8 },
  weekDaysRow: { flexDirection: "row", marginBottom: 4 },
  weekDayCell: { flex: 1, alignItems: "center", paddingVertical: 6 },
  weekDayText: { fontFamily: "Cairo_600SemiBold", fontSize: 9 },
  weekRow: { flexDirection: "row", marginBottom: 6 },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginHorizontal: 2,
    gap: 1,
  },
  dayNumber: { fontFamily: "Cairo_600SemiBold", fontSize: 15 },
  todayText: { fontFamily: "Cairo_700Bold" },
  dotRow: { flexDirection: "row", gap: 3, alignItems: "center" },
  shiftDot: { width: 5, height: 5, borderRadius: 2.5 },
  noteDot: { width: 4, height: 4, borderRadius: 2 },
  emptyCell: { flex: 1, marginHorizontal: 2 },
  goTodayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
  },
  goTodayText: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
});
