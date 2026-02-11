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
import Colors from "@/constants/colors";
import { useShiftConfig } from "@/lib/ShiftContext";
import {
  ShiftType,
  SHIFT_DEFINITIONS,
  getShiftForDate,
  getDaysInMonth,
  getFirstDayOfMonth,
  MONTH_NAMES_AR,
  DAY_NAMES_AR,
  parseDate,
} from "@/lib/shift-utils";

function ShiftBadge({ type }: { type: ShiftType }) {
  const def = SHIFT_DEFINITIONS[type];
  const shiftColor = Colors.shifts[type];
  return (
    <View style={[styles.shiftBadge, { backgroundColor: shiftColor.color }]}>
      <Text style={styles.shiftBadgeText}>{def.labelAr}</Text>
    </View>
  );
}

interface CalendarDayCellProps {
  day: number;
  shiftType: ShiftType;
  isToday: boolean;
  date: Date;
}

function CalendarDayCell({ day, shiftType, isToday, date }: CalendarDayCellProps) {
  const shiftColor = Colors.shifts[shiftType];

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/day-detail",
      params: {
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.dayCell,
        { backgroundColor: shiftColor.bg, opacity: pressed ? 0.7 : 1 },
        isToday && styles.todayCell,
      ]}
    >
      <Text
        style={[
          styles.dayNumber,
          { color: shiftColor.color },
          isToday && styles.todayText,
        ]}
      >
        {day}
      </Text>
      <View style={[styles.shiftDot, { backgroundColor: shiftColor.color }]} />
    </Pressable>
  );
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { config, isLoaded } = useShiftConfig();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const goToPrevMonth = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const goToToday = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  }, []);

  if (!isLoaded) return null;

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const startDate = parseDate(config.startDate);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const isCurrentMonth =
    currentYear === today.getFullYear() && currentMonth === today.getMonth();

  const todayShift = getShiftForDate(today, startDate, config.pattern);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.todayCard}>
          <View style={styles.todayCardLeft}>
            <Text style={styles.todayLabel}>اليوم</Text>
            <Text style={styles.todayDate}>
              {today.getDate()} {MONTH_NAMES_AR[today.getMonth()]}
            </Text>
          </View>
          <ShiftBadge type={todayShift} />
        </View>
      </Animated.View>

      <View style={styles.monthNav}>
        <Pressable onPress={goToNextMonth} hitSlop={12}>
          <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
        </Pressable>
        <Pressable onPress={goToToday}>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES_AR[currentMonth]} {currentYear}
          </Text>
        </Pressable>
        <Pressable onPress={goToPrevMonth} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.legend}>
        {(["morning", "evening", "night", "rest"] as ShiftType[]).map((type) => (
          <View key={type} style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: Colors.shifts[type].color }]}
            />
            <Text style={styles.legendText}>{SHIFT_DEFINITIONS[type].labelAr}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.calendarScroll}
        contentContainerStyle={[
          styles.calendarContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.weekDaysRow}>
          {DAY_NAMES_AR.map((name) => (
            <View key={name} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{name}</Text>
            </View>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day, di) => {
              if (day === null) {
                return <View key={di} style={styles.emptyCell} />;
              }
              const cellDate = new Date(currentYear, currentMonth, day);
              const shiftType = getShiftForDate(cellDate, startDate, config.pattern);
              const isToday =
                isCurrentMonth && day === today.getDate();
              return (
                <CalendarDayCell
                  key={di}
                  day={day}
                  shiftType={shiftType}
                  isToday={isToday}
                  date={cellDate}
                />
              );
            })}
          </View>
        ))}

        {!isCurrentMonth && (
          <Pressable onPress={goToToday} style={styles.goTodayButton}>
            <Ionicons name="today-outline" size={18} color={Colors.accent} />
            <Text style={styles.goTodayText}>العودة لليوم</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
  },
  todayCardLeft: {
    gap: 2,
  },
  todayLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  todayDate: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  shiftBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  shiftBadgeText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    color: "#FFF",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  monthTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  calendarScroll: {
    flex: 1,
  },
  calendarContent: {
    paddingHorizontal: 12,
  },
  weekDaysRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  weekDayText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginHorizontal: 3,
    gap: 2,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayNumber: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
  },
  todayText: {
    fontFamily: "Cairo_700Bold",
  },
  shiftDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  emptyCell: {
    flex: 1,
    marginHorizontal: 3,
  },
  goTodayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
  },
  goTodayText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    color: Colors.accent,
  },
});
