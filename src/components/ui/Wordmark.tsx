import { Image } from "expo-image";

// Source artwork is 1021 x 182 (assets/brand/wordmark@3x.png).
const ASPECT = 182 / 1021;

export function Wordmark({ width = 160 }: { width?: number }) {
  return (
    <Image
      source={require("../../../assets/brand/wordmark.png")}
      style={{ width, height: Math.round(width * ASPECT) }}
      contentFit="contain"
      accessibilityLabel="Farmkeke"
    />
  );
}
