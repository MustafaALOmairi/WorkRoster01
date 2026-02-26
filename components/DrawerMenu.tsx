import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  Image,
  Platform,
  I18nManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSound } from "@/lib/SoundContext";

export interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  colors: any;
  language: "ar" | "en";
  isDark: boolean;
}

const menuItems = [
  { route: "/search", icon: "search-outline" as const, labelAr: "بحث", labelEn: "Search" },
  { route: "/customize", icon: "color-palette-outline" as const, labelAr: "تخصيص", labelEn: "Customize" },
  { route: "/theme-store", icon: "storefront-outline" as const, labelAr: "متجر الثيمات", labelEn: "Theme Store" },
  { route: "/settings", icon: "settings-outline" as const, labelAr: "الإعدادات", labelEn: "Settings" },
  { route: "/about", icon: "information-circle-outline" as const, labelAr: "حول", labelEn: "About" },
];

const DRAWER_WIDTH = 280;

interface DrawerItemProps {
  item: typeof menuItems[number];
  colors: any;
  language: "ar" | "en";
  isDark: boolean;
  onPress: () => void;
}

function DrawerItem({ item, colors, language, isDark, onPress }: DrawerItemProps) {
  const { playSound } = useSound();
  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    playSound("tap");
    onPress();
  };

  const label = language === "ar" ? item.labelAr : item.labelEn;
  const isRTL = language === "ar";

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          opacity: pressed ? 0.6 : 1,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      <Ionicons
        name={item.icon}
        size={24}
        color={colors.text}
        style={{ marginHorizontal: 12 }}
      />
      <Text
        style={[
          styles.menuItemLabel,
          {
            color: colors.text,
            flex: 1,
            textAlign: isRTL ? "right" : "left",
          },
        ]}
      >
        {label}
      </Text>
      <Ionicons
        name={isRTL ? "chevron-back" : "chevron-forward"}
        size={20}
        color={colors.textSecondary}
        style={{ marginHorizontal: 12 }}
      />
    </Pressable>
  );
}

export function DrawerMenu({
  visible,
  onClose,
  onNavigate,
  colors,
  language,
  isDark,
}: DrawerMenuProps) {
  const { playSound } = useSound();
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);
  const isRTL = language === "ar";

  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      translateX.value = withTiming(-DRAWER_WIDTH, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible, translateX, backdropOpacity]);

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleMenuItemPress = (route: string) => {
    onNavigate(route);
    onClose();
  };

  const bgColor = colors.surface;
  const separatorColor = colors.border;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.backdrop,
            { backgroundColor: "rgba(0, 0, 0, 0.5)" },
            backdropAnimatedStyle,
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            { backgroundColor: bgColor, width: DRAWER_WIDTH },
            drawerAnimatedStyle,
          ]}
        >
          <View style={[styles.drawerHeader, { borderBottomColor: separatorColor }]}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons
                name="close"
                size={24}
                color={colors.text}
              />
            </Pressable>
          </View>

          <View style={styles.menuItemsContainer}>
            {menuItems.map((item) => (
              <DrawerItem
                key={item.route}
                item={item}
                colors={colors}
                language={language}
                isDark={isDark}
                onPress={() => handleMenuItemPress(item.route)}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  menuItemsContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  menuItemLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 16,
  },
});
