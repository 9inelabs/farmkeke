import { Image } from "expo-image";
import type { StyleProp, ImageStyle } from "react-native";

// One sharp source (668 x 122, cropped from the website's wordmark) that
// scales down cleanly to every size the app uses, on web as well as phones.
const ASPECT = 122 / 668;
// The light version (white "farm", lime "keke") for the dark green screens
const LIGHT_ASPECT = 135 / 705;

/** `tint` recolours it; `tone="light"` is the two-colour version for dark backgrounds. */
export function Wordmark({ width = 160, style, tint, tone = "dark" }: { width?: number; style?: StyleProp<ImageStyle>; tint?: string; tone?: "dark" | "light" }) {
  const light = tone === "light";
  return (
    <Image
      source={light ? require("../../../assets/brand/wordmark-light.png") : require("../../../assets/brand/wordmark.png")}
      style={[{ width, height: Math.round(width * (light ? LIGHT_ASPECT : ASPECT)) }, style]}
      contentFit="contain"
      tintColor={tint}
      accessibilityLabel="Farmkeke"
    />
  );
}
