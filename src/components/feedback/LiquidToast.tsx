// Toast motion options for approval (see app/dev/toasts.tsx). Each one shows
// the same message; only the way it arrives and leaves differs. All run on
// the UI thread with Reanimated springs and fall back to a plain fade when
// the phone's reduce-motion setting is on.
import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme/tokens";
import { useScreenWidth } from "@/theme/useScreenSize";

export type ToastMotion = "island" | "drop" | "spring" | "rise";

type Props = {
  motion: ToastMotion;
  /** false starts the exit; onHidden fires when it has finished. */
  visible: boolean;
  onHidden: () => void;
  children: ReactNode;
};

const HEIGHT = 60;
const DOT = 44;
// Above the tab bar, for the toast that rises out of the cart tab
const TAB_CLEARANCE = 84;

export function LiquidToast({ motion, visible, onHidden, children }: Props) {
  const width = useScreenWidth();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const full = width - spacing.screen * 2;

  const shape = useSharedValue(0); // 0 = dot / off-screen, 1 = full pill
  const move = useSharedValue(0); // 0 = start position, 1 = resting
  const content = useSharedValue(0);
  const squash = useSharedValue(1);

  useEffect(() => {
    if (reduce) {
      shape.value = 1;
      move.value = 1;
      content.value = withTiming(visible ? 1 : 0, { duration: 160 }, (done) => {
        if (done && !visible) runOnJS(onHidden)();
      });
      return;
    }
    const finish = (done?: boolean) => {
      "worklet";
      if (done) runOnJS(onHidden)();
    };
    if (visible) {
      switch (motion) {
        case "island":
          // A dot drops in, then stretches sideways into the pill like liquid.
          move.value = withSpring(1, { damping: 15, stiffness: 240 });
          shape.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 160, mass: 0.9 }));
          content.value = withDelay(400, withTiming(1, { duration: 200 }));
          break;
        case "drop":
          // Falls from above, squashes on landing, wobbles back into shape.
          shape.value = 1;
          move.value = withSpring(1, { damping: 11, stiffness: 170, mass: 0.8 });
          squash.value = withSequence(
            withTiming(1.08, { duration: 160, easing: Easing.out(Easing.quad) }),
            withSpring(0.93, { damping: 7, stiffness: 420 }),
            withSpring(1, { damping: 9, stiffness: 260 }),
          );
          content.value = withDelay(120, withTiming(1, { duration: 200 }));
          break;
        case "spring":
          // Slides down and settles with a soft overshoot, growing slightly as it lands.
          shape.value = 1;
          move.value = withSpring(1, { damping: 13, stiffness: 150, mass: 0.9 });
          content.value = withTiming(1, { duration: 220 });
          break;
        case "rise":
          // A lime drop rises out of the cart tab and swells into the message.
          move.value = withSpring(1, { damping: 15, stiffness: 170 });
          shape.value = withDelay(260, withSpring(1, { damping: 15, stiffness: 160 }));
          content.value = withDelay(450, withTiming(1, { duration: 200 }));
          break;
      }
    } else {
      content.value = withTiming(0, { duration: 120 });
      switch (motion) {
        case "island":
        case "rise":
          // Shrinks back to the dot, then the dot leaves.
          shape.value = withTiming(0, { duration: 260, easing: Easing.inOut(Easing.cubic) });
          move.value = withDelay(220, withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, finish));
          break;
        case "drop":
          squash.value = withTiming(1.06, { duration: 160 });
          move.value = withDelay(60, withTiming(0, { duration: 240, easing: Easing.in(Easing.back(1.6)) }, finish));
          break;
        case "spring":
          move.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, finish);
          break;
      }
    }
  }, [visible, motion, reduce, shape, move, content, squash, onHidden]);

  const fromBottom = motion === "rise";
  const box = useAnimatedStyle(() => {
    const dotted = motion === "island" || motion === "rise";
    // The pill may stretch a few points past its size as it springs open, never off the screen.
    const w = dotted ? Math.min(DOT + (full - DOT) * shape.value, full + 10) : full;
    const h = dotted ? interpolate(shape.value, [0, 1], [DOT, HEIGHT], Extrapolation.CLAMP) : HEIGHT;
    let translateY = 0;
    let scale = 1;
    let opacity = 1;
    if (motion === "island") {
      translateY = interpolate(move.value, [0, 1], [-90, 0]);
      scale = interpolate(move.value, [0, 1], [0.4, 1], Extrapolation.CLAMP);
    } else if (motion === "drop") {
      translateY = interpolate(move.value, [0, 1], [-160, 0]);
    } else if (motion === "spring") {
      translateY = interpolate(move.value, [0, 1], [-70, 0]);
      scale = interpolate(move.value, [0, 1], [0.9, 1], Extrapolation.CLAMP);
      opacity = interpolate(move.value, [0, 0.4, 1], [0, 1, 1]);
    } else {
      translateY = interpolate(move.value, [0, 1], [70, 0]);
      scale = interpolate(move.value, [0, 1], [0.3, 1], Extrapolation.CLAMP);
      opacity = interpolate(move.value, [0, 0.2, 1], [0, 1, 1]);
    }
    return {
      width: w,
      height: h,
      borderRadius: h / 2,
      opacity,
      backgroundColor: motion === "rise" ? interpolateColor(shape.value, [0.2, 0.7], [colors.lime, colors.forest]) : colors.forest,
      transform: [{ translateY }, { scale }, { scaleX: 2 - squash.value }, { scaleY: squash.value }],
    };
  });
  const inner = useAnimatedStyle(() => ({
    opacity: content.value,
    transform: [{ scale: interpolate(content.value, [0, 1], [0.92, 1]) }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.layer, fromBottom ? { bottom: insets.bottom + TAB_CLEARANCE } : { top: insets.top + spacing.sm }]}
    >
      <Animated.View style={[styles.toast, box]} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Animated.View style={[styles.content, { width: full }, inner]}>{children}</Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 50 },
  toast: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0B1A07",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  content: {
    height: HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
