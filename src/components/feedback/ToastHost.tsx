// The "Island" toast the founder chose: a dark dot drops in at the top and
// stretches sideways into the message, then shrinks back to a dot to leave.
// Tuned to feel quick: about a quarter of a second in, a third out. A new
// message arriving while one is open swaps the text in place with a small
// pulse instead of closing and reopening. Everything runs on the UI thread;
// with reduce motion on it's a plain fade.
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
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
import { CheckCircle, Info } from "@/components/icons";
import { Text } from "@/components/ui";
import { useToast, type Toast } from "@/store/toast";
import { colors, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { useScreenWidth } from "@/theme/useScreenSize";

const SHOW_MS = 3200;
const HEIGHT = 56;
const DOT = 40;
const EASE_OUT = Easing.out(Easing.cubic);

export function ToastHost() {
  const current = useToast((s) => s.current);
  const hide = useToast((s) => s.hide);
  const width = useScreenWidth();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const full = width - spacing.screen * 2;

  // What's on screen; it outlives `current` while the exit plays.
  const [shown, setShown] = useState<Toast | null>(null);
  const shape = useSharedValue(0); // 0 dot, 1 full pill
  const drop = useSharedValue(0); // 0 above the screen, 1 resting
  const content = useSharedValue(0);
  const pulse = useSharedValue(1);

  // What the animation is doing now, read without re-running the effect.
  const phase = useRef<"hidden" | "open" | "closing">("hidden");
  const clear = useCallback(() => {
    phase.current = "hidden";
    setShown(null);
  }, []);

  useEffect(() => {
    if (current !== null) {
      if (phase.current === "open") {
        // Replace in place: blink the text and give the pill a small pulse.
        content.value = withSequence(withTiming(0.2, { duration: 70 }), withTiming(1, { duration: 140, easing: EASE_OUT }));
        if (!reduce) pulse.value = withSequence(withTiming(1.035, { duration: 90 }), withSpring(1, { damping: 14, stiffness: 400 }));
      } else if (reduce) {
        shape.value = 1;
        drop.value = 1;
        content.value = withTiming(1, { duration: 150 });
      } else {
        // Enter (or re-open mid-exit, carrying on from wherever it is): the
        // dot drops, stretches, then the text fades up.
        drop.value = withSpring(1, { damping: 20, stiffness: 420, mass: 0.6 });
        shape.value = withDelay(60, withSpring(1, { damping: 22, stiffness: 340, mass: 0.7 }));
        content.value = withDelay(140, withTiming(1, { duration: 140, easing: EASE_OUT }));
      }
      phase.current = "open";
      setShown(current);
      const t = setTimeout(hide, SHOW_MS);
      return () => clearTimeout(t);
    }
    if (phase.current !== "open") return;
    // Exit: the text goes, the pill shrinks to the dot, the dot lifts away.
    phase.current = "closing";
    const done = (finished?: boolean) => {
      "worklet";
      // Not when a new toast interrupted the exit
      if (finished) runOnJS(clear)();
    };
    content.value = withTiming(0, { duration: 90 });
    if (reduce) {
      drop.value = withTiming(0, { duration: 150 }, done);
      return;
    }
    shape.value = withTiming(0, { duration: 200, easing: Easing.inOut(Easing.cubic) });
    drop.value = withDelay(120, withTiming(0, { duration: 140, easing: Easing.in(Easing.cubic) }, done));
  }, [current, hide, clear, reduce, shape, drop, content, pulse]);

  const pill = useAnimatedStyle(() => {
    // It may stretch a few points past its size as it springs open, never off the screen.
    const w = Math.min(DOT + (full - DOT) * shape.value, full + 6);
    const h = interpolate(shape.value, [0, 1], [DOT, HEIGHT], Extrapolation.CLAMP);
    return {
      width: w,
      height: h,
      borderRadius: h / 2,
      // Fades as the dot lifts away, so it never lingers
      opacity: reduce ? content.value : interpolate(drop.value, [0, 0.6], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(drop.value, [0, 1], [-70, 0]) },
        { scale: interpolate(drop.value, [0, 1], [0.5, 1], Extrapolation.CLAMP) * pulse.value },
      ],
    };
  });
  const inner = useAnimatedStyle(() => ({
    opacity: content.value,
    transform: [{ scale: interpolate(content.value, [0, 1], [0.94, 1]) }],
  }));

  if (shown === null) return null;
  const Icon = shown.tone === "success" ? CheckCircle : Info;
  const iconColor = shown.tone === "error" ? colors.badge : colors.lime;

  return (
    <View pointerEvents="box-none" style={[styles.layer, { top: insets.top + spacing.sm }]}>
      <Animated.View style={[styles.pill, pill]} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Animated.View style={[styles.content, { width: full }, inner]}>
          <Icon size={22} color={iconColor} variant="solid" />
          <Text variant="label" color={colors.white} numberOfLines={2} maxFontSizeMultiplier={1.2} style={styles.message}>
            {shown.message}
          </Text>
          {shown.action !== undefined && (
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => {
                const { href, onPress } = shown.action!;
                hide();
                onPress?.();
                if (href) router.push(href);
              }}
            >
              <Text variant="label" color={colors.lime} style={styles.action}>
                {shown.action.label}
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 100 },
  pill: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  content: { height: HEIGHT, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  message: { flex: 1 },
  action: { fontFamily: fonts.semibold },
});
