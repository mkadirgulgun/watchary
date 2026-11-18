import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/constants/theme";

type Props = {
  value: number; // 0 - 5, 0.5 adımlarla
  size?: number;
  onChange?: (value: number) => void;
};

/** Yarım yıldız destekli puan göstergesi. `onChange` verilirse dokunarak puanlanır. */
export function StarRating({ value, size = 18, onChange }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const name =
          value >= star
            ? "star"
            : value >= star - 0.5
              ? "star-half"
              : "star-outline";
        return (
          <View key={star} style={{ width: size, height: size }}>
            <Ionicons
              name={name}
              size={size}
              color={name === "star-outline" ? colors.textTertiary : colors.primary}
            />
            {onChange && (
              <View style={StyleSheet.absoluteFill}>
                <View style={styles.halves}>
                  <Pressable
                    style={styles.half}
                    accessibilityLabel={`${star - 0.5} yıldız`}
                    onPress={() => onChange(value === star - 0.5 ? 0 : star - 0.5)}
                  />
                  <Pressable
                    style={styles.half}
                    accessibilityLabel={`${star} yıldız`}
                    onPress={() => onChange(value === star ? 0 : star)}
                  />
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2, alignItems: "center" },
  halves: { flex: 1, flexDirection: "row" },
  half: { flex: 1 },
});
