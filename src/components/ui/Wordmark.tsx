import { Image } from "expo-image";
import type { StyleProp, ImageStyle } from "react-native";

// One sharp source (668 x 122, cropped from the website's wordmark) that
// scales down cleanly to every size the app uses, on web as well as phones.
const ASPECT = 122 / 668;

export function Wordmark({ width = 160, style }: { width?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={require("../../../assets/brand/wordmark.png")}
      style={[{ width, height: Math.round(width * ASPECT) }, style]}
      contentFit="contain"
      accessibilityLabel="Farmkeke"
    />
  );
}
