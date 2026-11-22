import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { APPLE_EASE_UI } from "@/theme/navigation";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Press in quickly; let go and it springs back crisply, with no visible bounce.
const PRESS_IN = { duration: 90, easing: APPLE_EASE_UI } as const;
const RELEASE = { damping: 22, stiffness: 420, mass: 0.6 } as const;

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while pressed. */
  pressedScale?: number;
};

/** Pressable that shrinks a touch under the finger (skipped with reduce motion). */
export function PressableScale({ style, pressedScale = 0.97, onPressIn, onPressOut, ...rest }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        if (!reduceMotion) scale.value = withTiming(pressedScale, PRESS_IN);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!reduceMotion) scale.value = withSpring(1, RELEASE);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}
