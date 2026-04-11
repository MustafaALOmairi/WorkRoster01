import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
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
  MONTH_NAMES_AR,
  MONTH_NAMES_EN,
  DAY_FULL_AR,
  DAY_FULL_EN,
} from "@/lib/shift-utils";
import { useColors } from "@/lib/useColors";
import { CustomShiftTimes } from "@/lib/ShiftContext";

interface Holiday {
  id: string;
  name: string;
  color: string;
  startDate: string;
  endDate: string;
}

export interface CircularCalendarProps {
  year: number;
  month: number;
  pattern: ShiftType[];
  configStartDate: string;
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  onOpenDayDetail: () => void;
  language: string;
  notes: Record<string, { text?: string }>;
  customShiftTimes: CustomShiftTimes;
  colors: ReturnType<typeof useColors>;
  shiftIcons?: Record<string, string>;
  holidays?: Holiday[];
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SIZE = Math.min(SCREEN_W - 20, SCREEN_H * 0.54, 355);
const CENTER = SIZE / 2;
const OUTER_R = SIZE * 0.43;
const INNER_R = SIZE * 0.285;

const SHIFT_DEFAULT_ICONS: Record<ShiftType, keyof typeof Ionicons.glyphMap> = {
  morning: "sunny",
  evening: "partly-sunny",
  night: "moon",
  rest: "leaf",
};

function computeBaseRot(index: number, total: number): number {
  return -(index / total) * 360;
}

export function CircularCalendar({
  year,
  month,
  pattern,
  configStartDate,
  selectedDate,
  onSelectDate,
  onOpenDayDetail,
  language,
  notes,
  customShiftTimes,
  colors,
  shiftIcons,
  holidays = [],
}: CircularCalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const startDate = parseDate(configStartDate);
  const today = new Date();

  const selDate = parseDate(selectedDate);
  const selShift = getShiftForDate(selDate, startDate, pattern);
  const selDef = SHIFT_DEFINITIONS[selShift];
  const selDay = selDate.getDate();
  const selInThisMonth =
    selDate.getFullYear() === year && selDate.getMonth() === month;
  const selShiftColor = colors.shifts[selShift];

  const monthNames = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const dayFullNames = language === "ar" ? DAY_FULL_AR : DAY_FULL_EN;

  const getTime = (shift: ShiftType): string | null => {
    if (shift === "rest") return null;
    const k = shift as "morning" | "evening" | "night";
    const t = customShiftTimes[k];
    if (t) return `${t.start} – ${t.end}`;
    const d = SHIFT_DEFINITIONS[shift];
    return d.startTime ? `${d.startTime} – ${d.endTime}` : null;
  };
  const selTime = getTime(selShift);

  const selFormatted = selInThisMonth
    ? `${dayFullNames[selDate.getDay()]}، ${selDay} ${monthNames[selDate.getMonth()]}`
    : `${monthNames[month]} ${year}`;

  const selHoliday = holidays.find((h) => {
    const s = parseDate(h.startDate);
    const e = parseDate(h.endDate);
    return selDate >= s && selDate <= e;
  });

  const noteText = notes[selectedDate]?.text;

  const circumference = 2 * Math.PI * OUTER_R;
  const degreesPerPx = 360 / circumference;
  // Cell dimensions: portrait rectangle, upright
  const slotSize = circumference / daysInMonth;
  const cellW = Math.min(26, Math.floor(slotSize * 0.76));
  const cellH = Math.round(cellW * 1.35);

  const getIcon = (shift: ShiftType): keyof typeof Ionicons.glyphMap => {
    if (shiftIcons?.[shift]) return shiftIcons[shift] as keyof typeof Ionicons.glyphMap;
    return SHIFT_DEFAULT_ICONS[shift];
  };

  const getDateKey = (d: number) => {
    const m1 = month + 1;
    return `${year}-${String(m1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  // ── Rotation animation (JS thread so we can read value) ─────────
  const initialIndex = selInThisMonth ? selDay - 1 : 0;
  const rotAnim = useRef(
    new Animated.Value(computeBaseRot(initialIndex, daysInMonth))
  ).current;

  // Track live value via listener (works without nativeDriver)
  const currentRotRef = useRef(computeBaseRot(initialIndex, daysInMonth));
  const dragStartRef = useRef(currentRotRef.current);
  const suppressNextEffect = useRef(false);
  const daysInMonthRef = useRef(daysInMonth);
  daysInMonthRef.current = daysInMonth;

  useEffect(() => {
    const id = rotAnim.addListener(({ value }) => {
      currentRotRef.current = value;
    });
    return () => rotAnim.removeListener(id);
  }, []);

  // Animate ring to selected day whenever selectedDate / month changes
  useEffect(() => {
    if (suppressNextEffect.current) {
      suppressNextEffect.current = false;
      return;
    }
    const index = selInThisMonth ? selDay - 1 : 0;
    const targetRot = computeBaseRot(index, daysInMonth);
    const diff = ((targetRot - currentRotRef.current) % 360 + 540) % 360 - 180;
    const animTarget = currentRotRef.current + diff;
    Animated.spring(rotAnim, {
      toValue: animTarget,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [selectedDate, month, year]);

  // ── PanResponder: rotate ring day-by-day ────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      // Don't capture on start — let taps fall through to Pressables
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      // Capture horizontal movement before parent sees it
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderGrant: () => {
        rotAnim.stopAnimation();
        dragStartRef.current = currentRotRef.current;
      },
      onPanResponderMove: (_, gs) => {
        rotAnim.setValue(dragStartRef.current + gs.dx * degreesPerPx);
      },
      onPanResponderRelease: (_, gs) => {
        const total = daysInMonthRef.current;
        const currentVisual = dragStartRef.current + gs.dx * degreesPerPx;
        const phase = ((-currentVisual) % 360 + 360) % 360;
        let nearestIndex = Math.round((phase / 360) * total) % total;
        nearestIndex = Math.max(0, Math.min(total - 1, nearestIndex));

        const snapRot = computeBaseRot(nearestIndex, total);
        const diff = ((snapRot - currentVisual) % 360 + 540) % 360 - 180;
        const animTarget = currentVisual + diff;

        Animated.spring(rotAnim, {
          toValue: animTarget,
          useNativeDriver: false,
          tension: 100,
          friction: 12,
        }).start();

        suppressNextEffect.current = true;
        onSelectDate(getDateKey(nearestIndex + 1));
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderTerminate: () => {},
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  // Interpolations for outer (+) and inner counter (-) rotation
  const RANGE = 36000;
  const outerRotate = rotAnim.interpolate({
    inputRange: [-RANGE, RANGE],
    outputRange: [`-${RANGE}deg`, `${RANGE}deg`],
  });
  const innerCounterRotate = rotAnim.interpolate({
    inputRange: [-RANGE, RANGE],
    outputRange: [`${RANGE}deg`, `-${RANGE}deg`],
  });

  return (
    <View
      style={[styles.container, { width: SIZE, height: SIZE }]}
      {...panResponder.panHandlers}
    >
      {/* Track ring background */}
      <View
        style={[
          styles.trackRing,
          {
            width: OUTER_R * 2 + cellH + 10,
            height: OUTER_R * 2 + cellH + 10,
            borderRadius: (OUTER_R + cellH / 2 + 5),
            left: CENTER - OUTER_R - cellH / 2 - 5,
            top: CENTER - OUTER_R - cellH / 2 - 5,
          },
        ]}
      />

      {/* Outer glow ring */}
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

      {/*
        OUTER Animated.View: rotates → causes cells to ORBIT around center
        INNER Animated.View: counter-rotates → keeps cells UPRIGHT (numbers readable)
      */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ rotate: outerRotate }] }]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ rotate: innerCounterRotate }] }]}
          pointerEvents="box-none"
        >
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const dateKey = getDateKey(d);
            const dateObj = new Date(year, month, d);
            const shift = getShiftForDate(dateObj, startDate, pattern);
            const shiftColor = colors.shifts[shift];

            // Position on ring
            const angle = (i / daysInMonth) * 2 * Math.PI - Math.PI / 2;
            const cx = CENTER + OUTER_R * Math.cos(angle);
            const cy = CENTER + OUTER_R * Math.sin(angle);

            const isSelected = dateKey === selectedDate;
            const isToday =
              dateObj.getFullYear() === today.getFullYear() &&
              dateObj.getMonth() === today.getMonth() &&
              dateObj.getDate() === today.getDate();
            const hasNote = !!notes[dateKey]?.text;

            return (
              <Pressable
                key={d}
                onPress={() => {
                  if (Platform.OS !== "web")
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectDate(dateKey);
                }}
                style={({ pressed }) => ({
                  position: "absolute",
                  left: cx - cellW / 2,
                  top: cy - cellH / 2,
                  width: cellW,
                  height: cellH,
                  backgroundColor: shiftColor.color,
                  borderRadius: 6,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: isSelected ? 2.5 : isToday ? 1.5 : 0,
                  borderColor: isSelected ? "#FFFFFF" : "#00E5FF",
                  opacity: pressed ? 0.75 : 1,
                  shadowColor: isSelected ? "#FFF" : shiftColor.color,
                  shadowOpacity: isSelected ? 0.95 : 0.35,
                  shadowRadius: isSelected ? 7 : 3,
                  elevation: isSelected ? 10 : 2,
                })}
              >
                <Text
                  style={{
                    color: "#FFF",
                    fontSize: Math.max(Math.round(cellW * 0.52), 9),
                    fontWeight: "700",
                    includeFontPadding: false,
                    textAlign: "center",
                  }}
                >
                  {d}
                </Text>
                {hasNote && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 2,
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: "#FFF",
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </Animated.View>
      </Animated.View>

      {/* Center details card — tap to open day detail */}
      <Pressable
        onPress={onOpenDayDetail}
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
        {selInThisMonth ? (
          <>
            <Ionicons
              name={getIcon(selShift)}
              size={20}
              color={selShiftColor.color}
            />
            <Text style={styles.centerDayNum}>{selDay}</Text>
            <Text style={[styles.centerShiftName, { color: selShiftColor.color }]}>
              {language === "ar" ? selDef.labelAr : selDef.label}
            </Text>
            <Text style={styles.centerDate} numberOfLines={2}>
              {selFormatted}
            </Text>
            {selTime ? (
              <Text style={styles.centerTime}>{selTime}</Text>
            ) : (
              <Text style={styles.centerTime}>
                {language === "ar" ? "يوم راحة" : "Day Off"}
              </Text>
            )}
            {selHoliday && (
              <View style={styles.centerHolidayRow}>
                <Ionicons name="star" size={9} color={selHoliday.color || "#FF9800"} />
                <Text
                  style={[
                    styles.centerHolidayText,
                    { color: selHoliday.color || "#FF9800" },
                  ]}
                  numberOfLines={1}
                >
                  {selHoliday.name}
                </Text>
              </View>
            )}
            {noteText ? (
              <View style={styles.centerNoteRow}>
                <Ionicons
                  name="document-text-outline"
                  size={9}
                  color="rgba(255,255,255,0.45)"
                />
                <Text style={styles.centerNoteText} numberOfLines={1}>
                  {noteText}
                </Text>
              </View>
            ) : null}
            <View style={styles.tapHintRow}>
              <Ionicons name="open-outline" size={8} color="rgba(255,255,255,0.28)" />
              <Text style={styles.tapHintText}>
                {language === "ar" ? "تفاصيل" : "details"}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.centerDayNum}>—</Text>
        )}
      </Pressable>

      {/* Top indicator dot at 12 o'clock */}
      <View style={[styles.topDot, { backgroundColor: "#00E5FF" }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignSelf: "center",
  },
  trackRing: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
  centerCircle: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F1923",
    borderWidth: 2,
    shadowColor: "#00E5FF",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    gap: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  centerDayNum: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "bold",
    lineHeight: 38,
    includeFontPadding: false,
  },
  centerShiftName: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  centerDate: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    textAlign: "center",
    marginTop: 1,
  },
  centerTime: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    marginTop: 1,
  },
  centerHolidayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  centerHolidayText: {
    fontSize: 9,
    fontWeight: "600",
    maxWidth: INNER_R * 1.6,
  },
  centerNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  centerNoteText: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 8,
    maxWidth: INNER_R * 1.6,
  },
  tapHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 3,
  },
  tapHintText: {
    color: "rgba(255,255,255,0.22)",
    fontSize: 7,
  },
  topDot: {
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
