import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";

import { colors, fonts, radius } from "@/constants/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const useNative = Platform.OS !== "web";

/**
 * Sekme ikonu: seçilince ikon yaylanarak büyür ve hafifçe yükselir, arkasında amber bir
 * vurgu kapsülü belirir. Seçimden çıkınca aynı animasyon tersine çalışır.
 */
function TabIcon({
  name,
  focusedName,
  focused,
  size,
}: {
  name: IconName;
  focusedName: IconName;
  focused: boolean;
  size: number;
}) {
  const [progress] = useState(() => new Animated.Value(focused ? 1 : 0));

  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      friction: 5,
      tension: 150,
      useNativeDriver: useNative,
    }).start();
  }, [focused, progress]);

  const iconScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const iconLift = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });
  const pillScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.pill,
          { opacity: progress, transform: [{ scaleX: pillScale }, { scaleY: pillScale }] },
        ]}
      />
      <Animated.View style={{ transform: [{ translateY: iconLift }, { scale: iconScale }] }}>
        <Ionicons
          name={focused ? focusedName : name}
          size={size}
          color={focused ? colors.primary : colors.textTertiary}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 58, height: 32, alignItems: "center", justifyContent: "center" },
  pill: {
    position: "absolute",
    width: 58,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Sekmeler arası geçişte sayfa hafifçe kayar (yöne göre sola/sağa).
        animation: "shift",
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontFamily: fonts.displaySemi, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Keşfet",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name="compass-outline" focusedName="compass" focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Akış",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name="pulse-outline" focusedName="pulse" focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="up-next"
        options={{
          title: "Sıradaki",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name="play-forward-outline" focusedName="play-forward" focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Takvim",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name="calendar-outline" focusedName="calendar" focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-list"
        options={{
          title: "Listem",
          tabBarIcon: ({ focused, size }) => (
            <TabIcon name="bookmark-outline" focusedName="bookmark" focused={focused} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
