import { Image } from "expo-image";

// Kırpılmış ekran + W işareti (684x594 oranı)
const RATIO = 684 / 594;

/** Watchary işareti. `size` yükseklik olarak verilir. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Image
      source={require("../../assets/images/logo-mark.png")}
      style={{ width: size * RATIO, height: size }}
      contentFit="contain"
      accessibilityLabel="Watchary"
    />
  );
}
