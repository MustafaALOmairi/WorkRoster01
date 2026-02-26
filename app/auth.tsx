import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/lib/useColors";
import { useAppTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { useSound } from "@/lib/SoundContext";
import { loadServerData, useDataReload } from "@/lib/DataSync";

function LoggedInView() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t, isDark } = useAppTheme();
  const { user, logout } = useAuth();
  const { playSound } = useSound();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const bgColor = isDark ? "#0D1117" : colors.surface;
  const cardBg = isDark ? "#161B22" : colors.surfaceSecondary;
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSound("navigate");
    await logout();
    setLoggingOut(false);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { playSound("navigate"); router.back(); }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("الحساب", "Account")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconSection}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accent + "20" }]}>
            <Ionicons name="person-circle" size={64} color={colors.accent} />
          </View>
          <Text style={[styles.usernameText, { color: colors.text }]}>
            {user?.username}
          </Text>
          <View style={styles.syncBadge}>
            <Ionicons name="cloud-done" size={16} color="#43A047" />
            <Text style={[styles.syncText, { color: "#43A047" }]}>
              {t("البيانات محفوظة تلقائياً", "Data auto-saved")}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={22} color={colors.accent} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t("اسم المستخدم", "Username")}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {user?.username}
              </Text>
            </View>
          </View>
          {user?.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={22} color={colors.accent} />
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  {t("البريد الإلكتروني", "Email")}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {user.email}
                </Text>
              </View>
            </View>
          )}
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="sync-outline" size={22} color={colors.accent} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {t("المزامنة", "Sync")}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {t("تلقائية", "Automatic")}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          disabled={loggingOut}
          style={[styles.logoutBtn, { borderColor: "#EF4444" }]}
          testID="logout-btn"
        >
          {loggingOut ? (
            <ActivityIndicator color="#EF4444" size="small" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.logoutBtnText}>
                {t("تسجيل الخروج", "Sign Out")}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t, isDark } = useAppTheme();
  const { user, login, register } = useAuth();
  const { playSound } = useSound();
  const { triggerReload } = useDataReload();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const bgColor = isDark ? "#0D1117" : colors.surface;
  const cardBg = isDark ? "#161B22" : colors.surfaceSecondary;
  const inputBg = isDark ? "#0D1117" : "#FFF";

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    return <LoggedInView />;
  }

  const handleSubmit = async () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError(t("يرجى ملء جميع الحقول", "Please fill all fields"));
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError(t("كلمات المرور غير متطابقة", "Passwords don't match"));
      return;
    }
    if (!isLogin && password.length < 6) {
      setError(t("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "Password must be at least 6 characters"));
      return;
    }
    if (!isLogin && username.trim().length < 3) {
      setError(t("اسم المستخدم يجب أن يكون 3 أحرف على الأقل", "Username must be at least 3 characters"));
      return;
    }
    if (!isLogin && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("البريد الإلكتروني غير صحيح", "Invalid email address"));
      return;
    }

    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = isLogin
      ? await login(username.trim(), password)
      : await register(username.trim(), password, email.trim() || undefined);

    if (result.ok) {
      playSound("success");
      if (isLogin) {
        const loaded = await loadServerData();
        if (loaded) {
          triggerReload();
        }
      }
      setLoading(false);
      router.back();
    } else {
      setLoading(false);
      playSound("error");
      const errCode = result.error || "";
      if (errCode === "INVALID_CREDENTIALS") {
        setError(t("اسم المستخدم أو كلمة المرور غير صحيحة", "Invalid username/email or password"));
      } else if (errCode === "USERNAME_TAKEN") {
        setError(t("اسم المستخدم مستخدم بالفعل", "Username already taken"));
      } else if (errCode === "EMAIL_TAKEN") {
        setError(t("البريد الإلكتروني مستخدم بالفعل", "Email already taken"));
      } else if (errCode === "INVALID_EMAIL") {
        setError(t("البريد الإلكتروني غير صحيح", "Invalid email address"));
      } else {
        setError(t("حدث خطأ، حاول مرة أخرى", "Something went wrong, try again"));
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bgColor }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.header}>
          <Pressable onPress={() => { playSound("navigate"); router.back(); }} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>
            {isLogin ? t("تسجيل الدخول", "Sign In") : t("حساب جديد", "Create Account")}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconSection}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accent + "20" }]}>
              <Ionicons name="person-circle" size={64} color={colors.accent} />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {isLogin
                  ? t("اسم المستخدم أو البريد الإلكتروني", "Username or Email")
                  : t("اسم المستخدم", "Username")}
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: colors.border }]}>
                <Ionicons name={isLogin ? "person-outline" : "person-outline"} size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={isLogin
                    ? t("أدخل اسم المستخدم أو الإيميل", "Enter username or email")
                    : t("أدخل اسم المستخدم", "Enter username")}
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={isLogin ? "email-address" : "default"}
                  testID="auth-username"
                />
              </View>
            </View>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {t("البريد الإلكتروني (اختياري)", "Email (optional)")}
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={t("أدخل البريد الإلكتروني", "Enter email")}
                    placeholderTextColor={colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    testID="auth-email"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {t("كلمة المرور", "Password")}
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t("أدخل كلمة المرور", "Enter password")}
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  testID="auth-password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {t("تأكيد كلمة المرور", "Confirm Password")}
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={t("أعد إدخال كلمة المرور", "Re-enter password")}
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    testID="auth-confirm-password"
                  />
                </View>
              </View>
            )}

            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.submitBtn, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
              testID="auth-submit"
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isLogin ? t("دخول", "Sign In") : t("إنشاء حساب", "Create Account")}
                </Text>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              playSound("tap");
              setIsLogin(!isLogin);
              setError("");
              setEmail("");
              setConfirmPassword("");
            }}
            style={styles.switchRow}
          >
            <Text style={[styles.switchText, { color: colors.textSecondary }]}>
              {isLogin
                ? t("ليس لديك حساب؟", "Don't have an account?")
                : t("لديك حساب بالفعل؟", "Already have an account?")}
            </Text>
            <Text style={[styles.switchLink, { color: colors.accent }]}>
              {isLogin
                ? t(" إنشاء حساب", " Create Account")
                : t(" تسجيل الدخول", " Sign In")}
            </Text>
          </Pressable>

          <View style={styles.skipSection}>
            <Pressable
              onPress={() => { playSound("navigate"); router.back(); }}
              style={styles.skipBtn}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                {t("متابعة بدون حساب", "Continue without account")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  iconSection: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  usernameText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 22,
  },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  syncText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  infoText: { gap: 2 },
  infoLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  infoValue: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    paddingHorizontal: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Cairo_400Regular",
    fontSize: 15,
    padding: 0,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: "#EF4444",
    flex: 1,
  },
  submitBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  submitBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  switchText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
  },
  switchLink: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
  },
  skipSection: {
    alignItems: "center",
    paddingBottom: 40,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  skipText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 24,
  },
  logoutBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#EF4444",
  },
});
