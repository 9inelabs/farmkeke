// Content reveal: each piece of a screen fades in one after another as the
// screen opens, in the screen's arrival style (screenMotion.tsx): rising a few
// points, gliding in from the right, or growing slightly. Skipped when the phone's "reduce
// motion" setting is on (PRD: motion respects reduce-motion).
import { Children, isValidElement, type ReactNode } from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, FadeInRight, Keyframe, ReduceMotion } from "react-native-reanimated";
import { motion } from "@/theme/tokens";
import { useScreenMotion, type ScreenMotion } from "./screenMotion";

/** Gap between consecutive items, how far each rises, and where the stagger stops growing. */
export const REVEAL_STEP_MS = 40;
const RISE = 14;
// How far content glides in on "slide" screens, and how small it starts on "scale" ones
const GLIDE = 22;
const SHRUNK = 0.96;
const MAX_STAGGERED = 8;
// Ease-out cubic as a bezier curve, which runs natively and in the browser.
const EASE_OUT = Easing.bezier(0.33, 1, 0.68, 1);

/** Entering animation for the item at `index` (0 = first on screen), in the screen's arrival style. */
export function revealIn(index: number, baseDelay = 0, style: ScreenMotion = "rise") {
  const delay = baseDelay + Math.min(index, MAX_STAGGERED) * REVEAL_STEP_MS;
  // In a browser, Reanimated pins an element at its first measured position and
  // size once an animation with custom starting values ends, so anything that
  // later grows (data arriving, the window resizing) overlaps what's below it.
  // The browser therefore keeps the stock animations.
  const web = Platform.OS === "web";
  if (style === "slide") {
    const slide = FadeInRight.duration(motion.slow).delay(delay).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
    return web ? slide : slide.withInitialValues({ opacity: 0, transform: [{ translateX: GLIDE }] });
  }
  if (style === "scale") {
    // FadeIn moves only opacity, so the grow is a keyframe of both
    if (web) return FadeIn.duration(motion.base).delay(delay).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
    return new Keyframe({
      0: { opacity: 0, transform: [{ scale: SHRUNK }] },
      100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
    })
      .duration(motion.base)
      .delay(delay)
      .reduceMotion(ReduceMotion.System);
  }
  const rise = FadeInDown.duration(motion.base).delay(delay).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
  return web ? rise : rise.withInitialValues({ opacity: 0, transform: [{ translateY: RISE }] });
}

/** One revealed block. */
export function Reveal({
  index = 0,
  delay = 0,
  style,
  pointerEvents,
  children,
}: {
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  /** "none" lets touches pass through decorative content. */
  pointerEvents?: "auto" | "none" | "box-none" | "box-only";
  children: ReactNode;
}) {
  const motionStyle = useScreenMotion();
  return (
    <Animated.View entering={revealIn(index, delay, motionStyle)} style={style} pointerEvents={pointerEvents}>
      {children}
    </Animated.View>
  );
}

/**
 * Reveals each direct child in turn. Use for vertical stacks of content;
 * each child is wrapped in its own animated view.
 */
export function Stagger({
  children,
  delay = 0,
  itemStyle,
}: {
  children: ReactNode;
  delay?: number;
  /** Style for the view wrapped around each child (e.g. to keep children centred or stretched). */
  itemStyle?: StyleProp<ViewStyle>;
}) {
  const motionStyle = useScreenMotion();
  // toArray already drops null, undefined and booleans.
  const items = Children.toArray(children);
  return (
    <>
      {items.map((child, index) => (
        <Animated.View
          key={isValidElement(child) && child.key != null ? child.key : index}
          entering={revealIn(index, delay, motionStyle)}
          style={itemStyle}
        >
          {child}
        </Animated.View>
      ))}
    </>
  );
}
