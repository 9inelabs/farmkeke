import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useState } from "react";
import { borders, colors, radii } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

type Option<T extends string> = { value: T; label: string };

const PAD = 5;

/** Two or three equal tabs in a hairline frame; the lime marker slides to the chosen one. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  // onLayout measures inside the border; the tabs sit inside the padding with a gap between them.
  const segment = width > 0 ? (width - PAD * 2 - PAD * (options.length - 1)) / options.length : 0;
  const marker = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: withSpring(index * (segment + PAD), { damping: 18, stiffness: 220, mass: 0.8 }) }],
  }));

  return (
    <View style={styles.frame} accessibilityRole="tablist">
      <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setWidth(e.nativeEvent.layout.width)} />
      {options.map((o) => (
        <View key={o.value} style={styles.track} />
      ))}
      {segment > 0 && <Animated.View style={[styles.marker, marker]} />}
      <View style={styles.row}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <PressableScale
              key={o.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onChange(o.value)}
              style={styles.option}
            >
              <Text variant="label" color={colors.ink} numberOfLines={1} maxFontSizeMultiplier={1.3} style={selected ? styles.on : styles.off}>
                {o.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const HEIGHT = 50;

const styles = StyleSheet.create({
  frame: {
    height: HEIGHT + PAD * 2,
    borderRadius: radii.md + 2,
    borderWidth: borders.hairline * 2,
    borderColor: colors.line,
    padding: PAD,
    flexDirection: "row",
    gap: PAD,
    backgroundColor: colors.white,
  },
  // Each tab sits on a soft tint; the marker covers the chosen one.
  track: { flex: 1, borderRadius: radii.md - 2, backgroundColor: colors.tint },
  marker: { position: "absolute", top: PAD, left: PAD, height: HEIGHT, borderRadius: radii.md - 2, backgroundColor: colors.lime },
  row: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, padding: PAD, flexDirection: "row", gap: PAD },
  option: { flex: 1, alignItems: "center", justifyContent: "center" },
  on: { fontFamily: fonts.semibold },
  off: { fontFamily: fonts.medium },
});
