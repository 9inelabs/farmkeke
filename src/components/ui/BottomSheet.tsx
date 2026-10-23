import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, motion, spacing } from "@/theme/tokens";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tapping the dimmed background closes the sheet (default true). */
  dismissible?: boolean;
  /** The grab handle at the top (default true). */
  handle?: boolean;
};

/**
 * Bottom sheet over the Figma scrim (#2C2C2C at 76%). It rises on a soft
 * spring (a touch of settle, no bounce) and drops away quickly on close.
 */
export function BottomSheet({ visible, onClose, children, dismissible = true, handle = true }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    if (visible) {
      setMounted(true);
      progress.value = reduceMotion ? 1 : withSpring(1, { damping: 22, stiffness: 210, mass: 0.9, overshootClamping: false });
    } else if (mounted) {
      progress.value = withTiming(0, { duration: reduceMotion ? 0 : motion.fast + 60, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, mounted, progress, reduceMotion]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: Math.min(progress.value, 1) }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [480, 0]) }],
  }));

  if (!mounted) return null;

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={StyleSheet.absoluteFill}
          disabled={!dismissible}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }, sheetStyle]}
      >
        {handle && <View style={styles.handle} />}
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: colors.scrim },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.sm,
  },
});
