import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/lib/useColors";
import { useAppTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { useSound } from "@/lib/SoundContext";
import { loadServerData, useDataReload } from "@/lib/DataSync";
import { getApiUrl } from "@/lib/query-client";

// ─── Logged-in: Account Management ───────────────────────────────────────────
function LoggedInView() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t, isDark } = useAppTheme();
  const { user, logout, updateUsername } = useAuth();
  const { playSound } = useSound();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const bgColor = isDark ? "#0D1117" : colors.surface;
  const cardBg = isDark ? "#161B22" : colors.surfaceSecondary;
  const inputBg = isDark ? "#0D1117" : "#FFF";
  const borderColor = isDark ? "#30363D" : colors.border;

  // panel open state
  const [panel, setPanel] = useState<"none" | "username" | "password">("none");

  // change username
  const [newUsername, setNewUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameSuccess, setUsernameSuccess] = useState(false);

  // change password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  // danger actions
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const togglePanel = (p: "username" | "password") => {
    setPanel((prev) => (prev === p ? "none" : p));
    setUsernameError(""); setUsernameSuccess(false);
    setPwError(""); setPwSuccess(false);
  };

  // ── Change username ──────────────────────────────────────────────
  const handleChangeUsername = async () => {
    setUsernameError(""); setUsernameSuccess(false);
    const trimmed = newUsername.trim();
    if (trimmed.length < 3) {
      setUsernameError(t("اسم المستخدم يجب أن يكون 3 أحرف على الأقل", "Username must be at least 3 characters"));
      return;
    }
    setUsernameLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const url = new URL("/api/auth/change-username", getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        updateUsername(trimmed);
        setUsernameSuccess(true);
        setNewUsername("");
        playSound("success");
      } else {
        if (data.error === "USERNAME_TAKEN")
          setUsernameError(t("اسم المستخدم مستخدم بالفعل", "Username already taken"));
        else if (data.error === "USERNAME_TOO_SHORT")
          setUsernameError(t("اسم المستخدم قصير جداً", "Username is too short"));
        else
          setUsernameError(t("حدث خطأ، حاول مرة أخرى", "Something went wrong"));
        playSound("error");
      }
    } catch {
      setUsernameError(t("تعذر الاتصال بالخادم", "Could not connect to server"));
    } finally {
      setUsernameLoading(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwError(""); setPwSuccess(false);
    if (!currentPw || !newPw || !confirmPw) {
      setPwError(t("يرجى ملء جميع الحقول", "Please fill all fields"));
      return;
    }
    if (newPw.length < 6) {
      setPwError(t("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل", "New password must be at least 6 characters"));
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(t("كلمتا المرور غير متطابقتين", "Passwords don't match"));
      return;
    }
    setPwLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const url = new URL("/api/auth/change-password", getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwSuccess(true);
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
        playSound("success");
      } else {
        if (data.error === "WRONG_PASSWORD")
          setPwError(t("كلمة المرور الحالية غير صحيحة", "Current password is incorrect"));
        else if (data.error === "PASSWORD_TOO_SHORT")
          setPwError(t("كلمة المرور الجديدة قصيرة جداً", "New password is too short"));
        else
          setPwError(t("حدث خطأ، حاول مرة أخرى", "Something went wrong"));
        playSound("error");
      }
    } catch {
      setPwError(t("تعذر الاتصال بالخادم", "Could not connect to server"));
    } finally {
      setPwLoading(false);
    }
  };

  // ── Sign out ─────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoggingOut(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSound("navigate");
    await logout();
    setLoggingOut(false);
    router.back();
  };

  // ── Delete account (2-step) ───────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      t("حذف الحساب", "Delete Account"),
      t("هل أنت متأكد من أنك تريد حذف الحساب؟", "Are you sure you want to delete your account?"),
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        { text: t("نعم، تابع", "Yes, Continue"), style: "destructive", onPress: handleDeleteStep2 },
      ]
    );
  };

  const handleDeleteStep2 = () => {
    Alert.alert(
      t("تأكيد نهائي", "Final Confirmation"),
      t(
        "سيتم حذف حسابك وجميع بياناتك من السحابة بشكل دائم ولا يمكن التراجع عن هذا الإجراء.",
        "Your account and all cloud data will be permanently deleted. This cannot be undone."
      ),
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        { text: t("احذف الحساب", "Delete Account"), style: "destructive", onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    setDeletingAccount(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const url = new URL("/api/auth/delete-account", getApiUrl());
      const res = await fetch(url.toString(), { method: "DELETE", credentials: "include" });
      if (res.ok) {
        await AsyncStorage.clear();
        await logout();
        playSound("navigate");
        router.replace("/");
      } else {
        Alert.alert(t("خطأ", "Error"), t("فشل حذف الحساب، حاول مرة أخرى", "Failed to delete account, try again"));
      }
    } catch {
      Alert.alert(t("خطأ", "Error"), t("تعذر الاتصال بالخادم", "Could not connect to server"));
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top + webTopInset }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { playSound("navigate"); router.back(); }} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("إدارة الحساب", "Account Management")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.accent + "22" }]}>
            <Ionicons name="person-circle" size={68} color={colors.accent} />
          </View>
          <Text style={[styles.displayName, { color: colors.text }]}>{user?.username}</Text>
          {user?.email ? (
            <Text style={[styles.displayEmail, { color: colors.textSecondary }]}>{user.email}</Text>
          ) : null}
          <View style={styles.syncRow}>
            <Ionicons name="cloud-done" size={14} color="#43A047" />
            <Text style={[styles.syncText, { color: "#43A047" }]}>
              {t("البيانات محفوظة تلقائياً", "Data auto-saved")}
            </Text>
          </View>
        </View>

        {/* ── Section: Account Settings ── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t("إعدادات الحساب", "Account Settings")}
        </Text>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>

          {/* Change username row */}
          <Pressable
            style={styles.menuRow}
            onPress={() => togglePanel("username")}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.accent + "18" }]}>
              <Ionicons name="person-outline" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>
              {t("تغيير اسم المستخدم", "Change Username")}
            </Text>
            <Ionicons
              name={panel === "username" ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          {panel === "username" && (
            <View style={[styles.panelBody, { borderTopColor: borderColor }]}>
              <Text style={[styles.panelCurrentLabel, { color: colors.textSecondary }]}>
                {t("الاسم الحالي: ", "Current: ")}<Text style={{ color: colors.text, fontFamily: "Cairo_700Bold" }}>{user?.username}</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
                <Ionicons name="at" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t("اسم المستخدم الجديد", "New username")}
                  placeholderTextColor={colors.textSecondary}
                  value={newUsername}
                  onChangeText={(v) => { setNewUsername(v); setUsernameError(""); setUsernameSuccess(false); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}
              {usernameSuccess ? (
                <View style={styles.successRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#43A047" />
                  <Text style={styles.successText}>{t("تم تغيير اسم المستخدم بنجاح", "Username updated successfully")}</Text>
                </View>
              ) : null}
              <Pressable
                style={[styles.panelBtn, { backgroundColor: colors.accent, opacity: usernameLoading ? 0.7 : 1 }]}
                onPress={handleChangeUsername}
                disabled={usernameLoading}
              >
                {usernameLoading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.panelBtnText}>{t("حفظ", "Save")}</Text>
                }
              </Pressable>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          {/* Change password row */}
          <Pressable
            style={styles.menuRow}
            onPress={() => togglePanel("password")}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#F59E0B18" }]}>
              <Ionicons name="lock-closed-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>
              {t("تغيير كلمة المرور", "Change Password")}
            </Text>
            <Ionicons
              name={panel === "password" ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          {panel === "password" && (
            <View style={[styles.panelBody, { borderTopColor: borderColor }]}>
              {/* Current password */}
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t("كلمة المرور الحالية", "Current password")}
                  placeholderTextColor={colors.textSecondary}
                  value={currentPw}
                  onChangeText={(v) => { setCurrentPw(v); setPwError(""); setPwSuccess(false); }}
                  secureTextEntry={!showCurPw}
                />
                <Pressable onPress={() => setShowCurPw(!showCurPw)} hitSlop={8}>
                  <Ionicons name={showCurPw ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
              {/* New password */}
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
                <Ionicons name="key-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t("كلمة المرور الجديدة", "New password")}
                  placeholderTextColor={colors.textSecondary}
                  value={newPw}
                  onChangeText={(v) => { setNewPw(v); setPwError(""); setPwSuccess(false); }}
                  secureTextEntry={!showNewPw}
                />
                <Pressable onPress={() => setShowNewPw(!showNewPw)} hitSlop={8}>
                  <Ionicons name={showNewPw ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
              {/* Confirm new password */}
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t("تأكيد كلمة المرور الجديدة", "Confirm new password")}
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPw}
                  onChangeText={(v) => { setConfirmPw(v); setPwError(""); setPwSuccess(false); }}
                  secureTextEntry={!showNewPw}
                />
              </View>
              {pwError ? <Text style={styles.errorText}>{pwError}</Text> : null}
              {pwSuccess ? (
                <View style={styles.successRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#43A047" />
                  <Text style={styles.successText}>{t("تم تغيير كلمة المرور بنجاح", "Password changed successfully")}</Text>
                </View>
              ) : null}
              <Pressable
                style={[styles.panelBtn, { backgroundColor: "#F59E0B", opacity: pwLoading ? 0.7 : 1 }]}
                onPress={handleChangePassword}
                disabled={pwLoading}
              >
                {pwLoading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.panelBtnText}>{t("حفظ", "Save")}</Text>
                }
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Section: Session ── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 28 }]}>
          {t("الجلسة", "Session")}
        </Text>

        <Pressable
          onPress={handleLogout}
          disabled={loggingOut || deletingAccount}
          style={[styles.actionRow, { backgroundColor: cardBg, borderColor }]}
          testID="logout-btn"
        >
          <View style={[styles.menuIcon, { backgroundColor: "#EF444418" }]}>
            {loggingOut
              ? <ActivityIndicator color="#EF4444" size="small" />
              : <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            }
          </View>
          <Text style={[styles.menuLabel, { color: "#EF4444" }]}>
            {t("تسجيل الخروج", "Sign Out")}
          </Text>
        </Pressable>

        {/* ── Section: Danger Zone ── */}
        <Text style={[styles.sectionLabel, { color: "#EF4444", marginTop: 28 }]}>
          {t("المنطقة الخطرة", "Danger Zone")}
        </Text>

        <Pressable
          onPress={handleDeleteAccount}
          disabled={deletingAccount || loggingOut}
          style={[styles.actionRow, { backgroundColor: cardBg, borderColor: "#9E000040", borderWidth: 1 }]}
          testID="delete-account-btn"
        >
          <View style={[styles.menuIcon, { backgroundColor: "#9E000018" }]}>
            {deletingAccount
              ? <ActivityIndicator color="#9E0000" size="small" />
              : <Ionicons name="trash-outline" size={20} color="#9E0000" />
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: "#9E0000" }]}>
              {t("حذف الحساب", "Delete Account")}
            </Text>
            <Text style={[styles.dangerSubtext, { color: "#9E000099" }]}>
              {t("يحذف جميع البيانات نهائياً", "Permanently deletes all data")}
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Login / Register screen ──────────────────────────────────────────────────
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

  if (user) return <LoggedInView />;

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
        if (loaded) triggerReload();
      }
      setLoading(false);
      router.back();
    } else {
      setLoading(false);
      playSound("error");
      const errCode = result.error || "";
      if (errCode === "INVALID_CREDENTIALS")
        setError(t("اسم المستخدم أو كلمة المرور غير صحيحة", "Invalid username/email or password"));
      else if (errCode === "USERNAME_TAKEN")
        setError(t("اسم المستخدم مستخدم بالفعل", "Username already taken"));
      else if (errCode === "EMAIL_TAKEN")
        setError(t("البريد الإلكتروني مستخدم بالفعل", "Email already taken"));
      else if (errCode === "INVALID_EMAIL")
        setError(t("البريد الإلكتروني غير صحيح", "Invalid email address"));
      else
        setError(t("حدث خطأ، حاول مرة أخرى", "Something went wrong, try again"));
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
          <View style={styles.avatarSection}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.accent + "22" }]}>
              <Ionicons name="person-circle" size={68} color={colors.accent} />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                {isLogin ? t("اسم المستخدم أو البريد الإلكتروني", "Username or Email") : t("اسم المستخدم", "Username")}
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={isLogin ? t("أدخل اسم المستخدم أو الإيميل", "Enter username or email") : t("أدخل اسم المستخدم", "Enter username")}
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
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
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
              {loading
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.submitBtnText}>{isLogin ? t("دخول", "Sign In") : t("إنشاء حساب", "Create Account")}</Text>
              }
            </Pressable>
          </View>

          <Pressable
            onPress={() => { playSound("tap"); setIsLogin(!isLogin); setError(""); setEmail(""); setConfirmPassword(""); }}
            style={styles.switchRow}
          >
            <Text style={[styles.switchText, { color: colors.textSecondary }]}>
              {isLogin ? t("ليس لديك حساب؟", "Don't have an account?") : t("لديك حساب بالفعل؟", "Already have an account?")}
            </Text>
            <Text style={[styles.switchLink, { color: colors.accent }]}>
              {isLogin ? t(" إنشاء حساب", " Create Account") : t(" تسجيل الدخول", " Sign In")}
            </Text>
          </Pressable>

          <View style={styles.skipSection}>
            <Pressable onPress={() => { playSound("navigate"); router.back(); }} style={styles.skipBtn}>
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
  title: { fontFamily: "Cairo_700Bold", fontSize: 20 },
  content: { flex: 1, paddingHorizontal: 16 },

  // Avatar section
  avatarSection: { alignItems: "center", paddingVertical: 24, gap: 6 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  displayName: { fontFamily: "Cairo_700Bold", fontSize: 20 },
  displayEmail: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  syncRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  syncText: { fontFamily: "Cairo_600SemiBold", fontSize: 12 },

  // Section label
  sectionLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 12, marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },

  // Card
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },

  // Menu row
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontFamily: "Cairo_600SemiBold", fontSize: 15 },

  divider: { height: 1, marginHorizontal: 16 },

  // Panel
  panelBody: {
    padding: 16,
    paddingTop: 14,
    gap: 10,
    borderTopWidth: 1,
  },
  panelCurrentLabel: { fontFamily: "Cairo_400Regular", fontSize: 13 },
  panelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 2,
  },
  panelBtnText: { fontFamily: "Cairo_700Bold", fontSize: 15, color: "#FFF" },

  // Input
  inputGroup: { gap: 6 },
  inputLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 14, paddingHorizontal: 2 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  input: { flex: 1, fontFamily: "Cairo_400Regular", fontSize: 15, padding: 0 },

  // Feedback
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 2 },
  errorText: { fontFamily: "Cairo_400Regular", fontSize: 13, color: "#EF4444", flex: 1 },
  successRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  successText: { fontFamily: "Cairo_400Regular", fontSize: 13, color: "#43A047" },

  // Action row (logout / delete)
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dangerSubtext: { fontFamily: "Cairo_400Regular", fontSize: 12, marginTop: 2 },

  // Auth form
  submitBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  submitBtnText: { fontFamily: "Cairo_700Bold", fontSize: 16, color: "#FFF" },
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 20 },
  switchText: { fontFamily: "Cairo_400Regular", fontSize: 14 },
  switchLink: { fontFamily: "Cairo_700Bold", fontSize: 14 },
  skipSection: { alignItems: "center", paddingBottom: 40 },
  skipBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  skipText: { fontFamily: "Cairo_400Regular", fontSize: 14, textDecorationLine: "underline" },
});
