import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { motion } from "@/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while pressed. */
  pressedScale?: number;
};

/** Pressable with a short ease-out press-in scale (skipped with reduce motion). */
export function PressableScale({ style, pressedScale = 0.97, onPressIn, onPressOut, ...rest }: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const timing = { duration: motion.fast, easing: Easing.out(Easing.quad) };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        if (!reduceMotion) scale.value = withTiming(pressedScale, timing);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!reduceMotion) scale.value = withTiming(1, timing);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}
