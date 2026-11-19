import { Image } from "expo-image";
import type { StyleProp, ImageStyle } from "react-native";

// One sharp source (668 x 122, cropped from the website's wordmark) that
// scales down cleanly to every size the app uses, on web as well as phones.
const ASPECT = 122 / 668;

/** `tint` recolours it, e.g. white on the dark green screens. */
export function Wordmark({ width = 160, style, tint }: { width?: number; style?: StyleProp<ImageStyle>; tint?: string }) {
  return (
    <Image
      source={require("../../../assets/brand/wordmark.png")}
      style={[{ width, height: Math.round(width * ASPECT) }, style]}
      contentFit="contain"
      tintColor={tint}
      accessibilityLabel="Farmkeke"
    />
  );
}
