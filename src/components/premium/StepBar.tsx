// The step bar across the top of the farmer sign-up: one segment per step.
// Earlier steps are full; the current one fills to `progress` as the screen
// opens, so moving to the next step reads as the bar growing.
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { colors } from "@/theme/tokens";

type Props = {
  total: number;
  /** 1-based step now showing. */
  current: number;
  /** How far into the current step (0 to 1). */
  progress?: number;
  tone?: "light" | "dark";
};

export function StepBar({ total, current, progress = 0.5, tone = "light" }: Props) {
  const dark = tone === "dark";
  return (
    <View style={styles.row} accessible accessibilityRole="progressbar" accessibilityLabel={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const fill = step < current ? 1 : step === current ? progress : 0;
        return <Segment key={step} fill={fill} animate={step === current} dark={dark} />;
      })}
    </View>
  );
}

function Segment({ fill, animate, dark }: { fill: number; animate: boolean; dark: boolean }) {
  const width = useSharedValue(animate ? 0 : fill);
  useEffect(() => {
    width.value = withDelay(120, withTiming(fill, { duration: 600, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }));
  }, [fill, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View style={[styles.track, { backgroundColor: dark ? "rgba(255,255,255,0.18)" : "#E6ECDF" }]}>
      <Animated.View style={[styles.fill, { backgroundColor: dark ? colors.lime : colors.forest }, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 5 },
  track: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});
