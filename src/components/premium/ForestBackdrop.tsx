// The deep green surface of the premium screens (welcome, sign-in, farmer
// sign-up), matching the website's dark sections: near-black green fading
// into forest, a soft lime glow in the top corner, a fainter one at the
// bottom, and a barely-there grid.
import { LinearGradient } from "expo-linear-gradient";
import { useId } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, Path, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";
import { colors } from "@/theme/tokens";

type Props = {
  style?: StyleProp<ViewStyle>;
  /** The faint grid lines. */
  grid?: boolean;
  /** Which top corner glows. */
  glow?: "right" | "left";
};

export function ForestBackdrop({ style, grid = true, glow = "right" }: Props) {
  // SVG ids are global on the web, so each backdrop gets its own
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient
        colors={[colors.forestDeep, colors.forestMid, colors.forest]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`top${id}`} cx={glow === "right" ? "100%" : "0%"} cy="0%" rx="75%" ry="45%" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor={colors.lime} stopOpacity={0.3} />
            <Stop offset="1" stopColor={colors.lime} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`bottom${id}`} cx={glow === "right" ? "0%" : "100%"} cy="100%" rx="65%" ry="40%" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor={colors.lime} stopOpacity={0.13} />
            <Stop offset="1" stopColor={colors.lime} stopOpacity={0} />
          </RadialGradient>
          {grid ? (
            <Pattern id={`grid${id}`} width={32} height={32} patternUnits="userSpaceOnUse">
              <Path d="M32 0H0V32" stroke="#FFFFFF" strokeOpacity={0.04} strokeWidth={1} fill="none" />
            </Pattern>
          ) : null}
        </Defs>
        {grid ? <Rect width="100%" height="100%" fill={`url(#grid${id})`} /> : null}
        <Rect width="100%" height="100%" fill={`url(#top${id})`} />
        <Rect width="100%" height="100%" fill={`url(#bottom${id})`} />
      </Svg>
    </View>
  );
}
