import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/lib/useColors";
import { useAppTheme } from "@/lib/ThemeContext";
import { useShiftConfig } from "@/lib/ShiftContext";
import {
  ShiftType,
  SHIFT_DEFINITIONS,
  searchDatesForShift,
  parseDate,
  MONTH_NAMES_AR,
  MONTH_NAMES_EN,
  DAY_FULL_AR,
  DAY_FULL_EN,
} from "@/lib/shift-utils";

interface SearchResultItem {
  date: Date;
  dateKey: string;
  dayName: string;
  formattedDate: string;
}

function SearchResultRow({
  item,
  shiftType,
  colors,
}: {
  item: SearchResultItem;
  shiftType: ShiftType;
  colors: ReturnType<typeof useColors>;
}) {
  const shiftColor = colors.shifts[shiftType];

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/day-detail", params: { date: item.dateKey } });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.resultRow,
        { backgroundColor: colors.surfaceSecondary, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.resultDot, { backgroundColor: shiftColor.color }]} />
      <View style={styles.resultInfo}>
        <Text style={[styles.resultDay, { color: colors.text }]}>{item.dayName}</Text>
        <Text style={[styles.resultDate, { color: colors.textSecondary }]}>
          {item.formattedDate}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { language, t } = useAppTheme();
  const { config } = useShiftConfig();
  const [selectedType, setSelectedType] = useState<ShiftType>("morning");

  const monthNames = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const dayFullNames = language === "ar" ? DAY_FULL_AR : DAY_FULL_EN;

  const results = useMemo(() => {
    const startDate = parseDate(config.startDate);
    const today = new Date();
    const dates = searchDatesForShift(selectedType, startDate, config.pattern, today, 30);
    return dates.map((d): SearchResultItem => {
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return {
        date: d,
        dateKey,
        dayName: dayFullNames[d.getDay()],
        formattedDate: `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      };
    });
  }, [selectedType, config, language]);

  const shiftTypes: ShiftType[] = ["morning", "evening", "night", "rest"];
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: insets.top + webTopInset }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t("بحث عن الشفتات", "Search Shifts")}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t("اختر نوع الشفت لعرض الأيام القادمة", "Select shift type to see upcoming days")}
      </Text>

      <View style={styles.filterRow}>
        {shiftTypes.map((type) => {
          const isActive = selectedType === type;
          const shiftColor = colors.shifts[type];
          return (
            <Pressable
              key={type}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedType(type);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? shiftColor.color : colors.surfaceSecondary,
                  borderColor: isActive ? shiftColor.color : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isActive ? "#FFF" : colors.text },
                ]}
              >
                {language === "ar" ? SHIFT_DEFINITIONS[type].labelAr : SHIFT_DEFINITIONS[type].label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
        {t(`${results.length} يوم قادم`, `${results.length} upcoming days`)}
      </Text>

      <FlatList
        data={results}
        keyExtractor={(item) => item.dateKey}
        renderItem={({ item }) => (
          <SearchResultRow item={item} shiftType={selectedType} colors={colors} />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100, gap: 8 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={results.length > 0}
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
    paddingBottom: 4,
  },
  subtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  filterChipText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
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
});
