import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/lib/AuthContext";
import { DataSyncProvider } from "@/lib/DataSync";
import { ShiftProvider } from "@/lib/ShiftContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { NotesProvider } from "@/lib/NotesContext";
import { SoundProvider } from "@/lib/SoundContext";
import { useFonts, Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold } from "@expo-google-fonts/cairo";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="search" />
      <Stack.Screen name="customize" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="about" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="theme-store" />
      <Stack.Screen
        name="day-detail"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.75],
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen
        name="import-holidays/[id]"
        options={{
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <KeyboardProvider>
            <AuthProvider>
              <DataSyncProvider>
                <ThemeProvider>
                  <ShiftProvider>
                    <NotesProvider>
                      <SoundProvider>
                        <RootLayoutNav />
                      </SoundProvider>
                    </NotesProvider>
                  </ShiftProvider>
                </ThemeProvider>
              </DataSyncProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
