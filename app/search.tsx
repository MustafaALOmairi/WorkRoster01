import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/lib/useColors";
import { useAppTheme } from "@/lib/ThemeContext";
import { useShiftConfig } from "@/lib/ShiftContext";
import { useSound } from "@/lib/SoundContext";
import {
  ShiftType,
  SHIFT_DEFINITIONS,
  getShiftForDate,
  parseDate,
  formatDate,
  MONTH_NAMES_AR,
  MONTH_NAMES_EN,
  DAY_FULL_AR,
  DAY_FULL_EN,
} from "@/lib/shift-utils";

interface DayResult {
  date: Date;
  dateKey: string;
  dayName: string;
  formattedDate: string;
  shiftType: ShiftType;
}

function ResultRow({ item, colors }: { item: DayResult; colors: ReturnType<typeof useColors> }) {
  const shiftColor = colors.shifts[item.shiftType];
  const def = SHIFT_DEFINITIONS[item.shiftType];

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/day-detail", params: { date: item.dateKey } });
      }}
      style={({ pressed }) => [
        styles.resultRow,
        { backgroundColor: colors.surfaceSecondary, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.resultDot, { backgroundColor: shiftColor.color }]} />
      <View style={styles.resultInfo}>
        <Text style={[styles.resultDay, { color: colors.text }]}>{item.dayName}</Text>
        <Text style={[styles.resultDate, { color: colors.textSecondary }]}>{item.formattedDate}</Text>
      </View>
      <View style={styles.resultShiftBadge}>
        <Text style={[styles.resultShiftText, { color: shiftColor.color }]}>
          {def.labelAr}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { language, t, isDark } = useAppTheme();
  const { config } = useShiftConfig();
  const { playSound } = useSound();
  const [searchMode, setSearchMode] = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState(formatDate(new Date()));
  const [fromDate, setFromDate] = useState(formatDate(new Date()));
  const [toDate, setToDate] = useState(formatDate(new Date()));

  const monthNames = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const dayFullNames = language === "ar" ? DAY_FULL_AR : DAY_FULL_EN;

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const adjustDate = (current: string, delta: number): string => {
    const d = parseDate(current);
    d.setDate(d.getDate() + delta);
    return formatDate(d);
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = parseDate(dateStr);
    return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  const singleResult = useMemo((): DayResult | null => {
    if (searchMode !== "single") return null;
    const d = parseDate(singleDate);
    const startDate = parseDate(config.startDate);
    const shiftType = getShiftForDate(d, startDate, config.pattern);
    const dateKey = singleDate;
    return {
      date: d,
      dateKey,
      dayName: dayFullNames[d.getDay()],
      formattedDate: `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      shiftType,
    };
  }, [singleDate, config, searchMode, language]);

  const rangeResults = useMemo((): DayResult[] => {
    if (searchMode !== "range") return [];
    const from = parseDate(fromDate);
    const to = parseDate(toDate);
    if (from > to) return [];
    const startDate = parseDate(config.startDate);
    const results: DayResult[] = [];
    const current = new Date(from);
    const maxDays = 366;
    let count = 0;
    while (current <= to && count < maxDays) {
      const shiftType = getShiftForDate(current, startDate, config.pattern);
      const dateKey = formatDate(current);
      results.push({
        date: new Date(current),
        dateKey,
        dayName: dayFullNames[current.getDay()],
        formattedDate: `${current.getDate()} ${monthNames[current.getMonth()]} ${current.getFullYear()}`,
        shiftType,
      });
      current.setDate(current.getDate() + 1);
      count++;
    }
    return results;
  }, [fromDate, toDate, config, searchMode, language]);

  const bgColor = isDark ? "#0D1117" : colors.surface;
  const cardBg = isDark ? "#161B22" : colors.surfaceSecondary;

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { playSound("navigate"); router.back(); }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("بحث", "Search")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.modeRow}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            playSound("toggle");
            setSearchMode("single");
          }}
          style={[styles.modeBtn, searchMode === "single" && { backgroundColor: colors.accent }]}
        >
          <Ionicons name="calendar-outline" size={16} color={searchMode === "single" ? "#FFF" : colors.text} />
          <Text style={[styles.modeBtnText, { color: searchMode === "single" ? "#FFF" : colors.text }]}>
            {t("تاريخ محدد", "Specific Date")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            playSound("toggle");
            setSearchMode("range");
          }}
          style={[styles.modeBtn, searchMode === "range" && { backgroundColor: colors.accent }]}
        >
          <Ionicons name="calendar-outline" size={16} color={searchMode === "range" ? "#FFF" : colors.text} />
          <Text style={[styles.modeBtnText, { color: searchMode === "range" ? "#FFF" : colors.text }]}>
            {t("فترة زمنية", "Date Range")}
          </Text>
        </Pressable>
      </View>

      {searchMode === "single" && (
        <View style={[styles.datePickerCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.datePickerLabel, { color: colors.textSecondary }]}>
            {t("اختر التاريخ", "Select Date")}
          </Text>
          <View style={styles.datePickerControls}>
            <Pressable onPress={() => { playSound("tap"); setSingleDate(adjustDate(singleDate, -1)); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} hitSlop={8}>
              <Ionicons name="remove-circle-outline" size={32} color={colors.accent} />
            </Pressable>
            <Text style={[styles.datePickerValue, { color: colors.text }]}>
              {formatDisplayDate(singleDate)}
            </Text>
            <Pressable onPress={() => { playSound("tap"); setSingleDate(adjustDate(singleDate, 1)); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} hitSlop={8}>
              <Ionicons name="add-circle-outline" size={32} color={colors.accent} />
            </Pressable>
          </View>
        </View>
      )}

      {searchMode === "range" && (
        <View style={[styles.datePickerCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.datePickerLabel, { color: colors.textSecondary }]}>
            {t("من", "From")}
          </Text>
          <View style={styles.datePickerControls}>
            <Pressable onPress={() => { playSound("tap"); setFromDate(adjustDate(fromDate, -1)); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} hitSlop={8}>
              <Ionicons name="remove-circle-outline" size={28} color={colors.accent} />
            </Pressable>
            <Text style={[styles.datePickerValue, { color: colors.text }]}>
              {formatDisplayDate(fromDate)}
            </Text>
            <Pressable onPress={() => { playSound("tap"); setFromDate(adjustDate(fromDate, 1)); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} hitSlop={8}>
              <Ionicons name="add-circle-outline" size={28} color={colors.accent} />
            </Pressable>
          </View>
          <View style={[styles.rangeSeparator, { borderTopColor: colors.border }]} />
          <Text style={[styles.datePickerLabel, { color: colors.textSecondary }]}>
            {t("إلى", "To")}
          </Text>
          <View style={styles.datePickerControls}>
            <Pressable onPress={() => { playSound("tap"); setToDate(adjustDate(toDate, -1)); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} hitSlop={8}>
              <Ionicons name="remove-circle-outline" size={28} color={colors.accent} />
            </Pressable>
            <Text style={[styles.datePickerValue, { color: colors.text }]}>
              {formatDisplayDate(toDate)}
            </Text>
            <Pressable onPress={() => { playSound("tap"); setToDate(adjustDate(toDate, 1)); if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} hitSlop={8}>
              <Ionicons name="add-circle-outline" size={28} color={colors.accent} />
            </Pressable>
          </View>
        </View>
      )}

      {searchMode === "single" && singleResult && (
        <View style={{ paddingHorizontal: 16, flex: 1 }}>
          <View style={[styles.singleResultCard, { backgroundColor: cardBg }]}>
            <View style={[styles.singleResultHeader, { backgroundColor: colors.shifts[singleResult.shiftType].color }]}>
              <Ionicons
                name={singleResult.shiftType === "morning" ? "sunny" : singleResult.shiftType === "evening" ? "partly-sunny" : singleResult.shiftType === "night" ? "moon" : "leaf"}
                size={28}
                color="#FFF"
              />
              <Text style={styles.singleResultShiftName}>
                {language === "ar" ? SHIFT_DEFINITIONS[singleResult.shiftType].labelAr : SHIFT_DEFINITIONS[singleResult.shiftType].label}
              </Text>
            </View>
            <View style={styles.singleResultBody}>
              <Text style={[styles.singleResultDayName, { color: colors.text }]}>
                {singleResult.dayName}
              </Text>
              <Text style={[styles.singleResultDate, { color: colors.textSecondary }]}>
                {singleResult.formattedDate}
              </Text>
              {singleResult.shiftType !== "rest" && (
                <Text style={[styles.singleResultTime, { color: colors.textSecondary }]}>
                  {config.customShiftTimes[singleResult.shiftType as "morning" | "evening" | "night"]?.start || SHIFT_DEFINITIONS[singleResult.shiftType].startTime}
                  {" - "}
                  {config.customShiftTimes[singleResult.shiftType as "morning" | "evening" | "night"]?.end || SHIFT_DEFINITIONS[singleResult.shiftType].endTime}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({ pathname: "/day-detail", params: { date: singleResult.dateKey } });
              }}
              style={[styles.viewDetailBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.viewDetailBtnText}>{t("عرض التفاصيل", "View Details")}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </Pressable>
          </View>
        </View>
      )}

      {searchMode === "range" && (
        <View style={{ flex: 1 }}>
          <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
            {t(`${rangeResults.length} يوم`, `${rangeResults.length} days`)}
          </Text>
          <FlatList
            data={rangeResults}
            keyExtractor={(item) => item.dateKey}
            renderItem={({ item }) => <ResultRow item={item} colors={colors} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 8 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={rangeResults.length > 0}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
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
  modeRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(128,128,128,0.1)",
  },
  modeBtnText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  datePickerCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginBottom: 16,
  },
  datePickerLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
    textAlign: "center",
  },
  datePickerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePickerValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  rangeSeparator: {
    borderTopWidth: 1,
    marginVertical: 4,
  },
  singleResultCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  singleResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 24,
  },
  singleResultShiftName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 22,
    color: "#FFF",
  },
  singleResultBody: {
    padding: 20,
    alignItems: "center",
    gap: 4,
  },
  singleResultDayName: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  singleResultDate: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
  },
  singleResultTime: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 16,
    marginTop: 4,
  },
  viewDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  viewDetailBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    color: "#FFF",
  },
  resultCount: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  resultDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  resultInfo: { flex: 1, gap: 2 },
  resultDay: { fontFamily: "Cairo_600SemiBold", fontSize: 15 },
  resultDate: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  resultShiftBadge: {
    paddingHorizontal: 8,
  },
  resultShiftText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
  },
});
