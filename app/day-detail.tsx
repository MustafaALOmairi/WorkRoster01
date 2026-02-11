import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useShiftConfig } from "@/lib/ShiftContext";
import {
  SHIFT_DEFINITIONS,
  getShiftForDate,
  parseDate,
  MONTH_NAMES_AR,
  DAY_NAMES_AR,
} from "@/lib/shift-utils";

export default function DayDetailSheet() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { config } = useShiftConfig();

  if (!date) return null;

  const d = parseDate(date);
  const startDate = parseDate(config.startDate);
  const shiftType = getShiftForDate(d, startDate, config.pattern);
  const def = SHIFT_DEFINITIONS[shiftType];
  const shiftColor = Colors.shifts[shiftType];

  const dayName = DAY_NAMES_AR[d.getDay()];
  const formattedDate = `${d.getDate()} ${MONTH_NAMES_AR[d.getMonth()]} ${d.getFullYear()}`;

  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    morning: "sunny",
    evening: "partly-sunny",
    night: "moon",
    rest: "leaf",
  };

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: shiftColor.bg }]}>
        <Ionicons name={iconMap[shiftType]} size={32} color={shiftColor.color} />
      </View>

      <Text style={styles.dateText}>{dayName} - {formattedDate}</Text>

      <View style={[styles.shiftCard, { backgroundColor: shiftColor.bg }]}>
        <Text style={[styles.shiftLabel, { color: shiftColor.color }]}>
          {def.labelAr}
        </Text>
        {def.startTime ? (
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color={shiftColor.color} />
            <Text style={[styles.timeText, { color: shiftColor.color }]}>
              {def.startTime} - {def.endTime}
            </Text>
          </View>
        ) : (
          <Text style={[styles.restText, { color: shiftColor.color }]}>
            يوم راحة
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: Colors.text,
    textAlign: "center",
  },
  shiftCard: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
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
});
