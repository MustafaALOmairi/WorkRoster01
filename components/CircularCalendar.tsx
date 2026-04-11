import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  ShiftType,
  SHIFT_DEFINITIONS,
  getShiftForDate,
  getDaysInMonth,
  parseDate,
  formatDate,
} from "@/lib/shift-utils";
import { useColors } from "@/lib/useColors";
import { CustomShiftTimes } from "@/lib/ShiftContext";

interface CircularCalendarProps {
  year: number;
  month: number;
  pattern: ShiftType[];
  configStartDate: string;
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  language: string;
  notes: Record<string, { text?: string }>;
  customShiftTimes: CustomShiftTimes;
  colors: ReturnType<typeof useColors>;
  shiftIcons?: Record<string, string>;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SIZE = Math.min(SCREEN_W - 24, SCREEN_H * 0.52, 340);
const CENTER = SIZE / 2;
const OUTER_R = SIZE * 0.434;
const DAY_NAME_R = SIZE * 0.32;
const INNER_R = SIZE * 0.24;

const SHIFT_DEFAULT_ICONS: Record<ShiftType, keyof typeof Ionicons.glyphMap> = {
  morning: "sunny",
  evening: "partly-sunny",
  night: "moon",
  rest: "leaf",
};

const DAY_SHORT_AR = ["أح", "إث", "ثل", "أر", "خم", "جم", "سب"];
const DAY_SHORT_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CircularCalendar({
  year,
  month,
  pattern,
  configStartDate,
  selectedDate,
  onSelectDate,
  language,
  notes,
  customShiftTimes,
  colors,
  shiftIcons,
}: CircularCalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const startDate = parseDate(configStartDate);
  const today = new Date();

  const spinAnim = useRef(new Animated.Value(0)).current;
  const prevMonth = useRef(month);

  useEffect(() => {
    if (prevMonth.current !== month) {
      const forward = month > prevMonth.current ||
        (prevMonth.current === 11 && month === 0);
      spinAnim.setValue(forward ? -30 : 30);
      Animated.spring(spinAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 9,
      }).start();
      prevMonth.current = month;
    }
  }, [month]);

  const selDate = parseDate(selectedDate);
  const selShift = getShiftForDate(selDate, startDate, pattern);
  const selDef = SHIFT_DEFINITIONS[selShift];
  const selDay = selDate.getDate();
  const selInThisMonth =
    selDate.getFullYear() === year && selDate.getMonth() === month;

  const selShiftColor = colors.shifts[selShift];

  const getTime = (shift: ShiftType) => {
    if (shift === "rest") return null;
    const k = shift as "morning" | "evening" | "night";
    const t = customShiftTimes[k];
    if (t) return `${t.start} – ${t.end}`;
    const d = SHIFT_DEFINITIONS[shift];
    return d.startTime ? `${d.startTime} – ${d.endTime}` : null;
  };
  const selTime = selInThisMonth ? getTime(selShift) : null;

  const circumference = 2 * Math.PI * OUTER_R;
  const cellSize = Math.min(26, Math.floor((circumference / daysInMonth) * 0.78));

  const getIcon = (shift: ShiftType): keyof typeof Ionicons.glyphMap => {
    if (shiftIcons?.[shift]) return shiftIcons[shift] as keyof typeof Ionicons.glyphMap;
    return SHIFT_DEFAULT_ICONS[shift];
  };

  const dayNames = language === "ar" ? DAY_SHORT_AR : DAY_SHORT_EN;

  const getDateKey = (d: number) => {
    const m1 = month + 1;
    return `${year}-${String(m1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  return (
    <View style={[styles.container, { width: SIZE, height: SIZE }]}>
      {/* Decorative outer glow ring */}
      <View
        style={[
          styles.glowRing,
          {
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderColor: "rgba(255,100,0,0.55)",
            shadowColor: "#FF6400",
          },
        ]}
      />
      <View
        style={[
          styles.glowRing,
          {
            width: SIZE - 14,
            height: SIZE - 14,
            borderRadius: (SIZE - 14) / 2,
            left: 7,
            top: 7,
            borderColor: "rgba(60,130,255,0.35)",
            shadowColor: "#3C82FF",
          },
        ]}
      />

      {/* Day cells spinning around the ring */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ rotate: spinAnim.interpolate({ inputRange: [-360, 360], outputRange: ["-360deg", "360deg"] }) }] },
        ]}
      >
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const dateKey = getDateKey(d);
          const dateObj = new Date(year, month, d);
          const shift = getShiftForDate(dateObj, startDate, pattern);
          const shiftColor = colors.shifts[shift];

          const angle = (i / daysInMonth) * 2 * Math.PI - Math.PI / 2;
          const x = CENTER + OUTER_R * Math.cos(angle);
          const y = CENTER + OUTER_R * Math.sin(angle);

          const isSelected = dateKey === selectedDate;
          const isToday =
            dateObj.getFullYear() === today.getFullYear() &&
            dateObj.getMonth() === today.getMonth() &&
            dateObj.getDate() === today.getDate();
          const hasNote = !!notes[dateKey]?.text;

          const cellAngleDeg = (i / daysInMonth) * 360 + 90;

          return (
            <Pressable
              key={d}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectDate(dateKey);
              }}
              style={({ pressed }) => [
                {
                  position: "absolute",
                  left: x - cellSize / 2,
                  top: y - cellSize / 2,
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: shiftColor.color,
                  borderRadius: 5,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: isSelected ? 2.5 : isToday ? 1.5 : 0,
                  borderColor: isSelected ? "#FFFFFF" : "#00E5FF",
                  transform: [{ rotate: `${cellAngleDeg}deg` }],
                  opacity: pressed ? 0.7 : 1,
                  shadowColor: isSelected ? "#FFF" : shiftColor.color,
                  shadowOpacity: isSelected ? 0.9 : 0.4,
                  shadowRadius: isSelected ? 6 : 3,
                  elevation: isSelected ? 8 : 2,
                },
              ]}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: Math.max(cellSize * 0.38, 8),
                  fontWeight: "bold",
                  transform: [{ rotate: `${-cellAngleDeg}deg` }],
                  includeFontPadding: false,
                }}
              >
                {d}
              </Text>
              {hasNote && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 1,
                    right: 1,
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "#FFF",
                    transform: [{ rotate: `${-cellAngleDeg}deg` }],
                  }}
                />
              )}
            </Pressable>
          );
        })}
      </Animated.View>

      {/* Inner day-name ring — 7 day labels at equal intervals */}
      {dayNames.map((name, i) => {
        const angle = (i / 7) * 2 * Math.PI - Math.PI / 2;
        const x = CENTER + DAY_NAME_R * Math.cos(angle);
        const y = CENTER + DAY_NAME_R * Math.sin(angle);
        return (
          <View
            key={name + i}
            style={{
              position: "absolute",
              left: x - 14,
              top: y - 9,
              width: 28,
              height: 18,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={styles.dayNameText}>{name}</Text>
          </View>
        );
      })}

      {/* Center circle — selected day info */}
      <View
        style={[
          styles.centerCircle,
          {
            width: INNER_R * 2,
            height: INNER_R * 2,
            borderRadius: INNER_R,
            left: CENTER - INNER_R,
            top: CENTER - INNER_R,
            borderColor: selShiftColor.color,
          },
        ]}
      >
        <Text style={styles.centerDayNum}>{selInThisMonth ? selDay : "-"}</Text>
        {selInThisMonth && (
          <>
            <Ionicons name={getIcon(selShift)} size={13} color={selShiftColor.color} style={{ marginTop: 1 }} />
            <Text style={[styles.centerShiftName, { color: selShiftColor.color }]}>
              {language === "ar" ? selDef.shortLabelAr : selDef.shortLabel}
            </Text>
            {selTime && (
              <Text style={styles.centerTime}>{selTime}</Text>
            )}
          </>
        )}
      </View>

      {/* Today dot at top */}
      <View style={[styles.todayDot, { backgroundColor: "#00E5FF" }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignSelf: "center",
  },
  glowRing: {
    position: "absolute",
    borderWidth: 2,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
    left: 0,
    top: 0,
  },
  dayNameText: {
    color: "#607080",
    fontSize: 9,
    fontWeight: "600",
  },
  centerCircle: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F1923",
    borderWidth: 2.5,
    shadowColor: "#00E5FF",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  centerDayNum: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 36,
    includeFontPadding: false,
  },
  centerShiftName: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  centerTime: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 8,
    marginTop: 1,
  },
  todayDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 3,
    left: CENTER - 4,
    shadowColor: "#00E5FF",
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
});
