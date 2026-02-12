import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/lib/useColors";
import { useAppTheme, STORE_THEMES, StoreTheme } from "@/lib/ThemeContext";
import { useSound } from "@/lib/SoundContext";
import { apiRequest } from "@/lib/query-client";
import * as Haptics from "expo-haptics";

const MINI_DAYS = [
  [null, null, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24, 25, 26],
];

const SHIFT_CYCLE: ("morning" | "evening" | "night" | "rest")[] = ["morning", "evening", "night", "rest"];

function MiniCalendarPreview({ theme }: { theme: StoreTheme }) {
  const lighten = (hex: string, amount: number) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
    return `rgb(${r},${g},${b})`;
  };

  return (
    <View style={[miniStyles.calendar, { backgroundColor: theme.surfaceBg, borderColor: theme.borderColor }]}>
      <View style={[miniStyles.calHeader, { backgroundColor: theme.headerBg }]}>
        <Text style={[miniStyles.calMonth, { color: theme.headerBg === "#212121" ? "#FFFFFF" : theme.textColor }]}>
          2026
        </Text>
      </View>
      <View style={[miniStyles.dayHeaders, { backgroundColor: theme.dayHeaderBg }]}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <View key={i} style={miniStyles.dayHeaderCell}>
            <Text style={[miniStyles.dayHeaderText, { color: theme.textSecondary }]}>{d}</Text>
          </View>
        ))}
      </View>
      {MINI_DAYS.map((week, wi) => (
        <View key={wi} style={miniStyles.weekRow}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={di} style={miniStyles.dayCell} />;
            }
            const shiftType = SHIFT_CYCLE[(day - 1) % 4];
            const shiftColor = theme.shiftColors[shiftType];
            const bgColor = lighten(shiftColor, 0.65);
            return (
              <View
                key={di}
                style={[miniStyles.dayCell, { backgroundColor: bgColor, borderRadius: 3 }]}
              >
                <Text style={[miniStyles.dayNum, { color: shiftColor }]}>{day}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function ThemeCard({
  theme,
  isActive,
  onApply,
  language,
}: {
  theme: StoreTheme;
  isActive: boolean;
  onApply: () => void;
  language: string;
}) {
  const colors = useColors();
  const { t } = useAppTheme();

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.surfaceSecondary, borderColor: isActive ? theme.accent : colors.border }]}>
      {theme.backgroundImage ? (
        <View style={cardStyles.imagePreviewContainer}>
          <Image
            source={{ uri: theme.backgroundImage }}
            style={cardStyles.imagePreview}
            resizeMode="cover"
          />
          <View style={cardStyles.imageOverlay}>
            <MiniCalendarPreview theme={theme} />
          </View>
        </View>
      ) : (
        <MiniCalendarPreview theme={theme} />
      )}

      <View style={cardStyles.info}>
        <View style={cardStyles.nameRow}>
          <Text style={[cardStyles.name, { color: colors.text, flex: 1 }]}>
            {language === "ar" ? theme.nameAr : theme.name}
          </Text>
          {theme.backgroundImage && (
            <View style={[cardStyles.imageBadge, { backgroundColor: theme.accent }]}>
              <Ionicons name="image" size={12} color="#FFF" />
            </View>
          )}
        </View>
        <Text style={[cardStyles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
          {language === "ar" ? theme.descriptionAr : theme.description}
        </Text>

        <View style={cardStyles.colorDots}>
          {Object.values(theme.shiftColors).map((c, i) => (
            <View key={i} style={[cardStyles.dot, { backgroundColor: c }]} />
          ))}
        </View>

        <Pressable
          onPress={onApply}
          style={({ pressed }) => [
            cardStyles.applyBtn,
            {
              backgroundColor: isActive ? colors.border : theme.accent,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {isActive ? (
            <Ionicons name="checkmark-circle" size={16} color={colors.text} />
          ) : (
            <Ionicons name="color-palette" size={16} color="#FFF" />
          )}
          <Text style={[cardStyles.applyText, { color: isActive ? colors.text : "#FFF" }]}>
            {isActive ? t("مفعّل", "Active") : t("تطبيق", "Apply")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const AI_SUGGESTIONS = [
  { en: "Anime characters", ar: "شخصيات أنمي" },
  { en: "Sports cars", ar: "سيارات رياضية" },
  { en: "Ocean sunset", ar: "غروب المحيط" },
  { en: "Cherry blossom", ar: "أزهار الكرز" },
  { en: "Space galaxy", ar: "فضاء ومجرات" },
  { en: "Football stadium", ar: "ملعب كرة قدم" },
  { en: "Nature forest", ar: "طبيعة وغابات" },
  { en: "Cyberpunk city", ar: "مدينة سايبربنك" },
];

export default function ThemeStoreScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t, isDark, language, storeThemeId, applyStoreTheme, aiGeneratedThemes, addAiTheme, removeAiTheme } = useAppTheme();
  const { playSound } = useSound();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;
  const bgColor = isDark ? "#0D1117" : colors.surface;

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<StoreTheme | null>(null);

  const handleApply = (themeId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (storeThemeId === themeId) {
      playSound("toggle");
      applyStoreTheme(null);
    } else {
      playSound("success");
      applyStoreTheme(themeId);
    }
  };

  const handleGenerate = async (prompt?: string) => {
    const desc = prompt || aiPrompt.trim();
    if (!desc || isGenerating) return;

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSound("navigate");
    setIsGenerating(true);
    setGeneratedPreview(null);

    try {
      const res = await apiRequest("POST", "/api/generate-theme", { description: desc, language });
      const data = await res.json();

      const newTheme: StoreTheme = {
        id: "ai_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        name: data.name || "AI Theme",
        nameAr: data.nameAr || "ثيم ذكي",
        description: data.description || desc,
        descriptionAr: data.descriptionAr || desc,
        mode: data.mode === "dark" ? "dark" : "light",
        accent: data.accent,
        shiftColors: data.shiftColors,
        headerBg: data.headerBg,
        dayHeaderBg: data.dayHeaderBg,
        surfaceBg: data.surfaceBg,
        cardBg: data.cardBg,
        textColor: data.textColor,
        textSecondary: data.textSecondary,
        borderColor: data.borderColor,
        backgroundImage: data.backgroundImage || undefined,
        backgroundOpacity: 0.15,
      };

      setGeneratedPreview(newTheme);
      playSound("success");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      playSound("toggle");
      Alert.alert(
        t("خطأ", "Error"),
        t("فشل إنشاء الثيم. حاول مرة أخرى.", "Failed to generate theme. Please try again.")
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAiTheme = () => {
    if (!generatedPreview) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSound("success");
    addAiTheme(generatedPreview);
    applyStoreTheme(generatedPreview.id);
    setGeneratedPreview(null);
    setAiPrompt("");
  };

  const handleDeleteAiTheme = (themeId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playSound("toggle");
    removeAiTheme(themeId);
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { playSound("navigate"); router.back(); }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("متجر الثيمات", "Theme Store")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="sparkles" size={18} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("إنشاء ثيم بالذكاء الاصطناعي", "AI Theme Generator")}
          </Text>
        </View>
        <Text style={[styles.sectionSubtext, { color: colors.textSecondary }]}>
          {t("صف الأجواء التي تريدها وسيتم إنشاء ثيم مخصص لك", "Describe the mood you want and get a custom theme")}
        </Text>

        <View style={[aiStyles.inputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <TextInput
            value={aiPrompt}
            onChangeText={setAiPrompt}
            placeholder={t("مثال: غروب على البحر...", "e.g. Ocean sunset...")}
            placeholderTextColor={colors.textSecondary}
            style={[aiStyles.input, { color: colors.text, textAlign: language === "ar" ? "right" : "left" }]}
            editable={!isGenerating}
            returnKeyType="go"
            onSubmitEditing={() => handleGenerate()}
          />
          <Pressable
            onPress={() => handleGenerate()}
            disabled={isGenerating || !aiPrompt.trim()}
            style={({ pressed }) => [
              aiStyles.generateBtn,
              {
                backgroundColor: isGenerating || !aiPrompt.trim() ? colors.border : colors.accent,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="sparkles" size={20} color="#FFF" />
            )}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={aiStyles.suggestionsRow}>
          {AI_SUGGESTIONS.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => {
                const text = language === "ar" ? s.ar : s.en;
                setAiPrompt(text);
                handleGenerate(text);
              }}
              disabled={isGenerating}
              style={({ pressed }) => [
                aiStyles.suggestionChip,
                {
                  backgroundColor: isDark ? "#1A1A2E" : "#F0F0F5",
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : isGenerating ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[aiStyles.suggestionText, { color: colors.textSecondary }]}>
                {language === "ar" ? s.ar : s.en}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {isGenerating && (
          <View style={[aiStyles.loadingCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[aiStyles.loadingText, { color: colors.textSecondary }]}>
              {t("جاري إنشاء الثيم والصورة...", "Generating theme & image...")}
            </Text>
          </View>
        )}

        {generatedPreview && !isGenerating && (
          <View style={{ marginBottom: 8 }}>
            <ThemeCard
              theme={generatedPreview}
              isActive={false}
              onApply={handleSaveAiTheme}
              language={language}
            />
            <View style={aiStyles.previewActions}>
              <Pressable
                onPress={handleSaveAiTheme}
                style={({ pressed }) => [
                  aiStyles.saveBtn,
                  { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={aiStyles.saveBtnText}>
                  {t("حفظ وتطبيق", "Save & Apply")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleGenerate()}
                style={({ pressed }) => [
                  aiStyles.retryBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="refresh" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        )}

        {aiGeneratedThemes.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Ionicons name="color-wand" size={18} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("ثيماتي المخصصة", "My AI Themes")}
              </Text>
            </View>
            {aiGeneratedThemes.map((theme) => (
              <View key={theme.id}>
                <ThemeCard
                  theme={theme}
                  isActive={storeThemeId === theme.id}
                  onApply={() => handleApply(theme.id)}
                  language={language}
                />
                <Pressable
                  onPress={() => handleDeleteAiTheme(theme.id)}
                  style={({ pressed }) => [
                    aiStyles.deleteBtn,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons name="trash-outline" size={14} color="#E53935" />
                  <Text style={aiStyles.deleteText}>{t("حذف", "Delete")}</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Ionicons name="color-palette" size={18} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("ثيمات التقويم", "Calendar Themes")}
          </Text>
        </View>
        <Text style={[styles.sectionSubtext, { color: colors.textSecondary }]}>
          {t("اختر ثيم لتغيير مظهر التقويم بالكامل", "Choose a theme to change the entire calendar look")}
        </Text>

        {STORE_THEMES.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={storeThemeId === theme.id}
            onApply={() => handleApply(theme.id)}
            language={language}
          />
        ))}

        {storeThemeId && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              playSound("toggle");
              applyStoreTheme(null);
            }}
            style={({ pressed }) => [
              styles.resetBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
            <Text style={[styles.resetText, { color: colors.textSecondary }]}>
              {t("إعادة للافتراضي", "Reset to Default")}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  calendar: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
  },
  calHeader: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  calMonth: {
    fontFamily: "Cairo_700Bold",
    fontSize: 12,
  },
  dayHeaders: {
    flexDirection: "row",
    paddingVertical: 3,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: "center",
  },
  dayHeaderText: {
    fontSize: 8,
    fontFamily: "Cairo_600SemiBold",
  },
  weekRow: {
    flexDirection: "row",
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
    marginHorizontal: 1,
    marginVertical: 1,
  },
  dayNum: {
    fontSize: 7,
    fontFamily: "Cairo_600SemiBold",
  },
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    marginBottom: 16,
  },
  imagePreviewContainer: {
    position: "relative",
    height: 160,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  imageBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    padding: 16,
    gap: 8,
  },
  name: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  desc: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  colorDots: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  applyText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
  },
});

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
  scrollContent: {
    paddingHorizontal: 20,
    gap: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  sectionSubtext: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    marginBottom: 16,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  resetText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
});

const aiStyles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    paddingVertical: 8,
  },
  generateBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionsRow: {
    marginBottom: 16,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  suggestionText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
  },
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 14,
  },
  loadingText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  previewActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: -8,
    marginBottom: 16,
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#FFF",
  },
  retryBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    marginTop: -10,
    marginBottom: 12,
  },
  deleteText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    color: "#E53935",
  },
});
