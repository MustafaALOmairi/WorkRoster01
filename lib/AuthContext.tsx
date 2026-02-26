import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "./query-client";

interface AuthUser {
  id: string;
  username: string;
  email?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (username: string, password: string, email?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  syncToServer: (data: { shiftConfig?: any; notes?: any; themePrefs?: any; aiThemes?: any }) => Promise<void>;
  loadFromServer: () => Promise<{ shiftConfig: any; notes: any; themePrefs: any; aiThemes: any } | null>;
}

const AUTH_STORAGE_KEY = "@shift_calendar_auth";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      const data = await res.json();
      const authUser = { id: data.id, username: data.username, email: data.email };
      setUser(authUser);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
    } catch {
      setUser(null);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username: usernameOrEmail, password });
      const data = await res.json();
      const authUser = { id: data.id, username: data.username, email: data.email };
      setUser(authUser);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: "INVALID_CREDENTIALS" };
    }
  }, []);

  const register = useCallback(async (username: string, password: string, email?: string) => {
    try {
      const body: any = { username, password };
      if (email) body.email = email;
      const res = await apiRequest("POST", "/api/auth/register", body);
      const data = await res.json();
      const authUser = { id: data.id, username: data.username, email: data.email };
      setUser(authUser);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      return { ok: true };
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("409")) {
        if (msg.includes("EMAIL_TAKEN")) return { ok: false, error: "EMAIL_TAKEN" };
        return { ok: false, error: "USERNAME_TAKEN" };
      }
      if (msg.includes("INVALID_EMAIL")) return { ok: false, error: "INVALID_EMAIL" };
      return { ok: false, error: "REGISTRATION_FAILED" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {}
    setUser(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const syncToServer = useCallback(async (data: { shiftConfig?: any; notes?: any; themePrefs?: any; aiThemes?: any }) => {
    if (!user) return;
    try {
      await apiRequest("POST", "/api/user-data/save", data);
    } catch (err: any) {
      console.error("Sync to server failed:", err?.message);
    }
  }, [user]);

  const loadFromServer = useCallback(async () => {
    if (!user) return null;
    try {
      const res = await apiRequest("GET", "/api/user-data/load");
      return await res.json();
    } catch {
      return null;
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    isLoading,
    login,
    register,
    logout,
    syncToServer,
    loadFromServer,
  }), [user, isLoading, login, register, logout, syncToServer, loadFromServer]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
