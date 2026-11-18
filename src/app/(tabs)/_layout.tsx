import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { colors, fonts } from "@/constants/theme";

type IconName = keyof typeof Ionicons.glyphMap;

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
  return (
    <Ionicons
      name={focused ? focusedName : name}
      size={size}
      color={focused ? colors.primary : colors.textTertiary}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
