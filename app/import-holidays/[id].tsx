import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/lib/useColors";
import { useAppTheme, AVAILABLE_COLORS } from "@/lib/ThemeContext";
import { useShiftConfig, Holiday } from "@/lib/ShiftContext";
import { parseDate, MONTH_NAMES_AR, MONTH_NAMES_EN } from "@/lib/shift-utils";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface SharedHoliday {
  name: string;
  startDate: string;
  endDate: string;
  color: string;
}

export default function ImportHolidaysScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { language, t } = useAppTheme();
  const { addHoliday } = useShiftConfig();
  const [holidays, setHolidays] = useState<SharedHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editColorIdx, setEditColorIdx] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const monthNames = language === "ar" ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    if (!id) return;
    const loadHolidays = async () => {
      try {
        const baseUrl = getApiUrl();
        const url = new URL(`/api/holidays/share/${id}`, baseUrl);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setHolidays(data.holidays || []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    loadHolidays();
  }, [id]);

  const updateHoliday = (idx: number, field: string, value: string) => {
    setHolidays((prev) => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = parseDate(dateStr);
    return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  };

  const handleAddAll = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    holidays.forEach((h) => {
      const holiday: Holiday = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: h.name,
        startDate: h.startDate,
        endDate: h.endDate,
        color: h.color,
      };
      addHoliday(holiday);
    });
    setAdded(true);
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.surface, paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t("جاري التحميل...", "Loading...")}
        </Text>
      </View>
    );
  }

  if (error || holidays.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.surface, paddingTop: insets.top + webTopInset }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          {t("لم يتم العثور على الإجازات", "Holidays not found")}
        </Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
          {t("قد يكون الرابط منتهي الصلاحية", "The link may have expired")}
        </Text>
        <Pressable onPress={() => router.replace("/")} style={[styles.backBtn, { backgroundColor: colors.accent }]}>
          <Text style={styles.backBtnText}>{t("العودة", "Go Back")}</Text>
        </Pressable>
      </View>
    );
  }

  if (added) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.surface, paddingTop: insets.top + webTopInset }]}>
        <Ionicons name="checkmark-circle" size={64} color="#43A047" />
        <Text style={[styles.successText, { color: colors.text }]}>
          {t("تمت إضافة الإجازات بنجاح", "Holidays added successfully")}
        </Text>
        <Pressable onPress={() => router.replace("/")} style={[styles.backBtn, { backgroundColor: colors.accent }]}>
          <Text style={styles.backBtnText}>{t("العودة للتقويم", "Back to Calendar")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("إجازات مشتركة", "Shared Holidays")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t("يمكنك تعديل الاسم واللون قبل الإضافة", "You can edit name and color before adding")}
      </Text>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {holidays.map((h, idx) => (
          <View key={idx} style={[styles.holidayCard, { backgroundColor: colors.surfaceSecondary }]}>
            <View style={styles.cardHeader}>
              <Pressable onPress={() => setEditColorIdx(editColorIdx === idx ? null : idx)}>
                <View style={[styles.colorDot, { backgroundColor: h.color }]} />
              </Pressable>
              {editingIdx === idx ? (
                <TextInput
                  style={[styles.nameInput, { color: colors.text, borderColor: colors.border }]}
                  value={h.name}
                  onChangeText={(v) => updateHoliday(idx, "name", v)}
                  autoFocus
                  onBlur={() => setEditingIdx(null)}
                />
              ) : (
                <Pressable onPress={() => setEditingIdx(idx)} style={styles.nameRow}>
                  <Text style={[styles.nameText, { color: colors.text }]}>{h.name}</Text>
                  <Ionicons name="pencil" size={14} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {editColorIdx === idx && (
              <View style={styles.colorGrid}>
                {AVAILABLE_COLORS.slice(0, 16).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => { updateHoliday(idx, "color", c); setEditColorIdx(null); }}
                    style={[styles.colorGridItem, { backgroundColor: c }, h.color === c && styles.colorGridItemActive]}
                  >
                    {h.color === c && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {formatDisplayDate(h.startDate)}
              {h.startDate !== h.endDate ? ` → ${formatDisplayDate(h.endDate)}` : ""}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) }]}>
        <Pressable onPress={handleAddAll} style={[styles.addAllBtn, { backgroundColor: colors.accent }]}>
          <Ionicons name="add-circle-outline" size={20} color="#FFF" />
          <Text style={styles.addAllBtnText}>
            {t(`إضافة ${holidays.length} إجازات`, `Add ${holidays.length} Holidays`)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 20,
  },
  subtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  holidayCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  nameInput: {
    flex: 1,
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  nameRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 6,
  },
  colorGridItem: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  colorGridItemActive: {
    borderWidth: 2,
    borderColor: "#FFF",
  },
  dateText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    marginLeft: 40,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  addAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addAllBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
  loadingText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
  },
  errorText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  errorSubtext: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
  },
  successText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#FFF",
  },
});
