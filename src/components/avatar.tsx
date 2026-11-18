import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { colors, radius } from "@/constants/theme";

type Props = {
  name: string;
  uri?: string | null;
  size?: number;
};

/** Profil resmi; resim yoksa adın baş harfi. */
export function Avatar({ name, uri, size = 34 }: Props) {
  return (
    <View style={[styles.circle, { width: size, height: size }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <AppText
          variant="label"
          color={colors.onPrimary}
          style={{ fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.5) }}
        >
          {name.slice(0, 1).toUpperCase()}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
