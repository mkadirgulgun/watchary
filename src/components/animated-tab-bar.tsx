import { BottomTabBarHeightCallbackContext, BottomTabBarProps } from "expo-router/tabs";
import { use, useEffect, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { AppText } from "@/components/app-text";
import { colors, fonts, radius } from "@/constants/theme";

const useNative = Platform.OS !== "web";

/** Bu genişlikten sonra ikon ve yazı yan yana durur (bilgisayar). */
const WIDE = 600;
const NARROW_PILL = { width: 58, height: 32, top: 6 };
const WIDE_PILL = { width: 128, height: 38 };

/**
 * Alt sekme çubuğu. Seçili sekmenin arkasındaki amber kapsül, sekmeler arasında yaylanarak
 * kayar; seçilen ikon da küçük bir zıplama yapar.
 */
export function AnimatedTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { width: screenWidth } = useWindowDimensions();
  const wide = screenWidth >= WIDE;
  const onHeightChange = use(BottomTabBarHeightCallbackContext);

  const [barWidth, setBarWidth] = useState(0);
  const count = state.routes.length;
  const itemWidth = barWidth / count;
  const pill = wide ? WIDE_PILL : NARROW_PILL;
  const targetX = state.index * itemWidth + (itemWidth - pill.width) / 2;

  const [x] = useState(() => new Animated.Value(0));

  // Seçili sekme değişince kapsül yaylanarak yeni yerine kayar
  useEffect(() => {
    if (barWidth === 0) return;
    Animated.spring(x, {
      toValue: targetX,
      friction: 8,
      tension: 120,
      useNativeDriver: useNative,
    }).start();
  }, [targetX, barWidth, x]);

  // Çubuğun ölçüsü ilk kez (ya da pencere boyutu değişince) belli olunca kapsül animasyonsuz yerleşir
  const onRowLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setBarWidth(w);
    x.setValue(state.index * (w / count) + (w / count - pill.width) / 2);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    onHeightChange?.(e.nativeEvent.layout.height);
  };

  return (
    <View
      style={[styles.bar, { paddingBottom: insets.bottom }]}
      onLayout={onLayout}
      accessibilityRole="tablist"
    >
      <View style={wide ? styles.rowWide : styles.row} onLayout={onRowLayout}>
        {barWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              wide
                ? { width: WIDE_PILL.width, height: WIDE_PILL.height, top: 9 }
                : { width: NARROW_PILL.width, height: NARROW_PILL.height, top: NARROW_PILL.top },
              { transform: [{ translateX: x }] },
            ]}
          />
        )}

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const color = focused ? colors.primary : colors.textTertiary;

          const onPress = () => {
            const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <Pressable
              key={route.key}
              style={[styles.item, wide && styles.itemWide]}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
              role="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              <View style={wide ? styles.contentWide : styles.content}>
                <View style={wide ? undefined : styles.iconBox}>
                  {options.tabBarIcon?.({ focused, color, size: 24 })}
                </View>
                <AppText
                  variant="caption"
                  color={color}
                  style={[styles.label, wide && styles.labelWide]}
                  numberOfLines={1}
                >
                  {label}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: { flexDirection: "row", paddingTop: 6, paddingBottom: 6 },
  rowWide: { flexDirection: "row", paddingVertical: 9 },
  pill: {
    position: "absolute",
    left: 0,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
  itemWide: { justifyContent: "center" },
  content: { alignItems: "center", gap: 2 },
  contentWide: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 38 },
  iconBox: { width: 58, height: 32, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: fonts.displaySemi, fontSize: 11 },
  labelWide: { fontSize: 13 },
});
