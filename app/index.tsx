import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  Image,
  ImageBackground,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/lib/useColors";
import { useAppTheme } from "@/lib/ThemeContext";
import { useShiftConfig } from "@/lib/ShiftContext";
import { useNotes } from "@/lib/NotesContext";
import { useSound } from "@/lib/SoundContext";
import { DrawerMenu } from "@/components/DrawerMenu";
import {
  ShiftType,
  SHIFT_DEFINITIONS,
  getShiftForDate,
  getDaysInMonth,
  getFirstDayOfMonth,
  MONTH_NAMES_AR,
  MONTH_NAMES_EN,
  MONTH_SHORT_EN,
  DAY_NAMES_AR,
  DAY_NAMES_EN,
  DAY_FULL_AR,
  DAY_FULL_EN,
  parseDate,
  formatDate,
} from "@/lib/shift-utils";

interface CalendarDayCellProps {
  day: number;
  shiftType: ShiftType;
  isToday: boolean;
  isSelected: boolean;
  dayOfWeek: number;
  colors: ReturnType<typeof useColors>;
  hasNote: boolean;
  isHoliday: boolean;
  lang: string;
  onSelect: () => void;
}

function CalendarDayCell({
  day, shiftType, isToday, isSelected, dayOfWeek, colors, hasNote, isHoliday, lang, onSelect,
}: CalendarDayCellProps) {
  const def = SHIFT_DEFINITIONS[shiftType];
  const shiftColor = colors.shifts[shiftType];
  const { playSound } = useSound();

  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const isFriday = dayOfWeek === 5;

  let numberColor = colors.isDark ? "#C8CDD3" : "#555";
  if (isSunday || (lang === "ar" && isFriday)) numberColor = "#5B9BD5";
  if (isSaturday) numberColor = "#D4A84B";

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playSound("select");
    onSelect();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.dayCell,
        (isToday || isSelected) && [styles.dayCellHighlight, { borderColor: "#5B9BD5" }],
        isSelected && { backgroundColor: "rgba(91,155,213,0.1)" },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.shiftLabelText, { color: shiftColor.color }]}>
        {lang === "ar" ? def.shortLabelAr : def.shortLabel}
      </Text>
      <Text style={[styles.dayNumber, { color: numberColor }]}>
        {day}
      </Text>
      {(hasNote || isHoliday) && (
        <View style={styles.indicatorRow}>
          {hasNote && <View style={[styles.indicatorDot, { backgroundColor: colors.accent }]} />}
          {isHoliday && <View style={[styles.indicatorDot, { backgroundColor: "#FF9800" }]} />}
        </View>
      )}
    </Pressable>
  );
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { language, t, isDark, activeStoreTheme, setLanguage } = useAppTheme();
  const { config, isLoaded } = useShiftConfig();
  const { notes } = useNotes();
  const { playSound } = useSound();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const todayKey = formatDate(today);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const monthNames = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const monthShort = language === "ar" ? MONTH_NAMES_AR : MONTH_SHORT_EN;
  const dayNames = language === "ar" ? DAY_NAMES_AR : DAY_NAMES_EN;
  const dayFullNames = language === "ar" ? DAY_FULL_AR : DAY_FULL_EN;

  const goToPrevMonth = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playSound("tap");
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playSound("tap");
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  }, [currentMonth]);

  const goToToday = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSound("navigate");
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayKey);
  }, []);

  const handleDrawerNavigate = (route: string) => {
    playSound("navigate");
    setDrawerVisible(false);
    setTimeout(() => {
      router.push(route as any);
    }, 100);
  };

  const goToPrevMonthRef = useRef(goToPrevMonth);
  goToPrevMonthRef.current = goToPrevMonth;
  const goToNextMonthRef = useRef(goToNextMonth);
  goToNextMonthRef.current = goToNextMonth;
  const languageRef = useRef(language);
  languageRef.current = language;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const isArabic = languageRef.current === "ar";
        if (gestureState.dx > 50) {
          if (isArabic) {
            goToNextMonthRef.current();
          } else {
            goToPrevMonthRef.current();
          }
        } else if (gestureState.dx < -50) {
          if (isArabic) {
            goToPrevMonthRef.current();
          } else {
            goToNextMonthRef.current();
          }
        }
      },
    })
  ).current;

  if (!isLoaded) return null;

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const startDate = parseDate(config.startDate);
  const isHolidayDate = (dateKey: string): boolean => {
    return config.holidays.some((h) => dateKey >= h.startDate && dateKey <= h.endDate);
  };
  const getHolidayForDate = (dateKey: string) => {
    return config.holidays.find((h) => dateKey >= h.startDate && dateKey <= h.endDate);
  };
  const getAllHolidaysForDate = (dateKey: string) => {
    return config.holidays.filter((h) => dateKey >= h.startDate && dateKey <= h.endDate);
  };

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) weeks.push(calendarDays.slice(i, i + 7));

  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const selDate = parseDate(selectedDate);
  const selShift = getShiftForDate(selDate, startDate, config.pattern);
  const selDef = SHIFT_DEFINITIONS[selShift];
  const selColor = colors.shifts[selShift];
  const selDayName = dayFullNames[selDate.getDay()];
  const selFormatted = language === "ar"
    ? `${selDayName}، ${selDate.getDate()} ${monthNames[selDate.getMonth()]}`
    : `${selDayName}, ${monthShort[selDate.getMonth()]} ${selDate.getDate()}`;

  const customTimes = config.customShiftTimes;
  let selStartTime = selDef.startTime;
  let selEndTime = selDef.endTime;
  if (selShift !== "rest" && customTimes[selShift as "morning" | "evening" | "night"]) {
    selStartTime = customTimes[selShift as "morning" | "evening" | "night"].start;
    selEndTime = customTimes[selShift as "morning" | "evening" | "night"].end;
  }

  const selHolidays = getAllHolidaysForDate(selectedDate);

  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    morning: "sunny",
    evening: "partly-sunny",
    night: "moon",
    rest: "leaf",
  };

  const bgColor = isDark ? "#0D1117" : colors.surface;
  const cardBg = isDark ? "#161B22" : colors.surfaceSecondary;
  const headerColor = isDark ? "#C9D1D9" : colors.text;
  const subtextColor = isDark ? "#8B949E" : colors.textSecondary;

  const weekendSundayColor = "#5B9BD5";
  const weekendSaturdayColor = "#D4A84B";
  const weekendFridayColor = language === "ar" ? "#5B9BD5" : undefined;

  const themeBgImage = activeStoreTheme?.backgroundImage;
  const themeBgOpacity = activeStoreTheme?.backgroundOpacity ?? 0.15;

  const calendarContent = (
    <>
      <View style={styles.weekDaysRow}>
        {dayNames.map((name, i) => {
          let dayColor = isDark ? "#C8CDD3" : "#777";
          if (i === 0) dayColor = weekendSundayColor;
          if (i === 6) dayColor = weekendSaturdayColor;
          if (language === "ar" && i === 5) dayColor = weekendFridayColor || dayColor;
          return (
            <View key={name} style={styles.weekDayCell}>
              <Text style={[styles.weekDayText, { color: dayColor }]}>{name}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.calendarGrid}>
        {weeks.map((week, wi) => (
          <View key={wi} style={[styles.weekRow, wi < weeks.length - 1 && styles.weekRowBorder, { borderBottomColor: isDark ? "#21262D" : "#E8E8E8" }]}>
            {week.map((day, di) => {
              if (day === null) return <View key={di} style={styles.emptyCell} />;
              const cellDate = new Date(currentYear, currentMonth, day);
              const shiftType = getShiftForDate(cellDate, startDate, config.pattern);
              const dateKey = formatDate(cellDate);
              const hasNote = !!notes[dateKey]?.text;
              const isHoliday = isHolidayDate(dateKey);
              const isToday = isCurrentMonth && day === today.getDate();
              return (
                <CalendarDayCell
                  key={di}
                  day={day}
                  shiftType={shiftType}
                  isToday={isToday}
                  isSelected={dateKey === selectedDate}
                  dayOfWeek={di}
                  colors={colors}
                  hasNote={hasNote}
                  isHoliday={isHoliday}
                  lang={language}
                  onSelect={() => setSelectedDate(dateKey)}
                />
              );
            })}
          </View>
        ))}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: Platform.OS === "web" ? webTopInset : insets.top }]}>
      <View style={styles.topHeader}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            playSound("open");
            setDrawerVisible(true);
          }}
          hitSlop={12}
        >
          <Ionicons name="menu" size={24} color={headerColor} />
        </Pressable>
        <View style={styles.monthNavCenter}>
          <Pressable onPress={language === "ar" ? goToNextMonth : goToPrevMonth} hitSlop={12}>
            <Ionicons name={language === "ar" ? "chevron-forward" : "chevron-back"} size={20} color={subtextColor} />
          </Pressable>
          <Pressable onPress={goToToday}>
            <Text style={[styles.monthTitle, { color: headerColor }]}>
              {monthShort[currentMonth]} {currentYear}
            </Text>
          </Pressable>
          <Pressable onPress={language === "ar" ? goToPrevMonth : goToNextMonth} hitSlop={12}>
            <Ionicons name={language === "ar" ? "chevron-back" : "chevron-forward"} size={20} color={subtextColor} />
          </Pressable>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              playSound("tap");
              setLanguage(language === "ar" ? "en" : "ar");
            }}
            hitSlop={8}
            style={styles.langToggle}
          >
            <Text style={[styles.langToggleText, { color: "#5B9BD5" }]}>
              {language === "ar" ? "EN" : "ع"}
            </Text>
          </Pressable>
          <Pressable onPress={goToToday} hitSlop={12}>
            <Ionicons name="calendar" size={22} color="#5B9BD5" />
          </Pressable>
        </View>
      </View>

      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {themeBgImage ? (
          <View style={styles.calendarWithBg}>
            <Image
              source={{ uri: themeBgImage }}
              style={[StyleSheet.absoluteFill, { opacity: themeBgOpacity }]}
              resizeMode="cover"
            />
            {calendarContent}
          </View>
        ) : (
          <View style={styles.calendarWithBg}>
            {calendarContent}
          </View>
        )}
      </View>

      <View style={[styles.detailCard, { backgroundColor: "#1A1A2E", paddingBottom: insets.bottom + webBottomInset + 16 }]}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            playSound("navigate");
            router.push({ pathname: "/day-detail", params: { date: selectedDate } });
          }}
          style={styles.detailCardInner}
        >
          <Text style={[styles.detailDateText, { color: "#FFFFFF" }]}>{selFormatted}</Text>

          {selHolidays.map((h) => (
            <View key={h.id} style={styles.holidayTag}>
              <Ionicons name="star" size={14} color={h.color || "#FF9800"} />
              <Text style={[styles.holidayTagText, { color: h.color || "#FF9800" }]}>{h.name}</Text>
            </View>
          ))}

          <View style={styles.detailShiftRow}>
            <Ionicons name={iconMap[selShift]} size={20} color={selColor.color} />
            <Text style={[styles.detailShiftName, { color: selColor.color }]}>
              {language === "ar" ? selDef.labelAr : `${selDef.label} Shift`}
            </Text>
          </View>

          {selStartTime ? (
            <Text style={[styles.detailTime, { color: "#B0B0C0" }]}>
              {selStartTime} - {selEndTime}
            </Text>
          ) : (
            <Text style={[styles.detailTime, { color: "#B0B0C0" }]}>
              {t("يوم راحة", "Day Off")}
            </Text>
          )}

          {notes[selectedDate]?.text ? (
            <View style={styles.notePreview}>
              <Ionicons name="document-text-outline" size={14} color="#B0B0C0" />
              <Text style={[styles.notePreviewText, { color: "#B0B0C0" }]} numberOfLines={2}>
                {notes[selectedDate].text}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.detailActions}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: "/day-detail", params: { date: selectedDate } });
            }}
            style={styles.detailActionRow}
          >
            <Ionicons name="create-outline" size={18} color="#B0B0C0" />
            <Text style={[styles.detailActionText, { color: "#B0B0C0" }]}>
              {t("إضافة ملاحظة", "Add note")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: "/day-detail", params: { date: selectedDate } });
            }}
            style={styles.detailActionRow}
          >
            <Ionicons name="notifications-outline" size={18} color="#B0B0C0" />
            <Text style={[styles.detailActionText, { color: "#B0B0C0" }]}>
              {t("تعيين تذكير", "Set reminder")}
            </Text>
          </Pressable>
        </View>
      </View>

      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onNavigate={handleDrawerNavigate}
        colors={colors}
        language={language}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  monthNavCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  monthTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  langToggle: {
    borderWidth: 1.5,
    borderColor: "#5B9BD5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  langToggleText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
  },
  weekDaysRow: {
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  weekDayCell: { flex: 1, alignItems: "center" },
  weekDayText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  calendarWithBg: {
    flex: 1,
    overflow: "hidden",
  },
  calendarGrid: {
    flex: 1,
    paddingHorizontal: 6,
  },
  weekRow: {
    flexDirection: "row",
    flex: 1,
  },
  weekRowBorder: {
    borderBottomWidth: 1,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    marginHorizontal: 1,
    borderRadius: 8,
  },
  dayCellHighlight: {
    borderWidth: 2,
    borderRadius: 8,
  },
  shiftLabelText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 11,
  },
  dayNumber: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    marginTop: -1,
  },
  indicatorRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 1,
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  emptyCell: { flex: 1, marginHorizontal: 1 },
  detailCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  detailCardInner: {
    gap: 4,
  },
  detailDateText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  holidayTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  holidayTagText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  detailShiftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  detailShiftName: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 16,
  },
  detailTime: {
    fontFamily: "Cairo_400Regular",
    fontSize: 15,
    marginTop: 2,
  },
  notePreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
  },
  notePreviewText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  detailActions: {
    marginTop: 16,
    gap: 14,
  },
  detailActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailActionText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
  },
});
