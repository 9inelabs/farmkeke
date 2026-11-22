// Content reveal (APK correction #1, Nov 2026). The screen transition
// (screenMotion.tsx) already brings a screen's content in, so content that is
// there when the screen arrives just arrives with it: no second animation, no
// piece-by-piece build-up. Content that shows up later (data loading in, a
// sub-tab switched, a list refreshed) fades in quickly with a small rise and
// at most a few tens of milliseconds between pieces. A block given an explicit
// `delay` is part of a choreographed sequence (a success tick, then its text)
// and always plays, on a compressed timeline. Skipped when the phone's
// "reduce motion" setting is on (PRD: motion respects reduce-motion).
import { Children, isValidElement, useContext, useState, type ReactNode } from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, Keyframe, ReduceMotion } from "react-native-reanimated";
import { NavigationRouteContext } from "expo-router/react-navigation";
import { APPLE_EASE_UI } from "@/theme/navigation";
import { arrivalOf } from "./screenMotion";

/** Gap between consecutive items, and how many items the gap grows for. */
export const REVEAL_STEP_MS = 25;
const MAX_STAGGERED = 4;
const DURATION = 200;
const RISE = 6;
/** Content that mounts within this long of its screen arriving came with the screen. */
const ARRIVAL_WINDOW_MS = 400;
/** Choreographed delays play at this fraction of what the caller asked for. */
const DELAY_SCALE = 0.6;

/** Entering animation for the item at `index` (0 = first on screen). */
export function revealIn(index: number, baseDelay = 0) {
  const delay = Math.round(baseDelay * DELAY_SCALE) + Math.min(index, MAX_STAGGERED) * REVEAL_STEP_MS;
  // In a browser, Reanimated pins an element at its first measured position and
  // size once an animation with custom starting values ends, so anything that
  // later grows overlaps what's below it. The browser therefore just fades.
  if (Platform.OS === "web") return FadeIn.duration(DURATION).delay(delay).reduceMotion(ReduceMotion.System);
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: RISE }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: APPLE_EASE_UI },
  })
    .duration(DURATION)
    .delay(delay)
    .reduceMotion(ReduceMotion.System);
}

/**
 * Whether content mounting now should animate: not when it is arriving with
 * its screen (the screen transition shows it), unless it is choreographed.
 * Decided once, when the content first mounts.
 */
function useShouldReveal(delay: number): boolean {
  const route = useContext(NavigationRouteContext);
  const [reveal] = useState(() => {
    if (delay > 0) return true;
    if (!route) return true;
    return Date.now() - arrivalOf(route.key) > ARRIVAL_WINDOW_MS;
  });
  return reveal;
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
  const reveal = useShouldReveal(delay);
  return (
    <Animated.View entering={reveal ? revealIn(index, delay) : undefined} style={style} pointerEvents={pointerEvents}>
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
  const reveal = useShouldReveal(delay);
  // toArray already drops null, undefined and booleans.
  const items = Children.toArray(children);
  return (
    <>
      {items.map((child, index) => (
        <Animated.View
          key={isValidElement(child) && child.key != null ? child.key : index}
          entering={reveal ? revealIn(index, delay) : undefined}
          style={itemStyle}
        >
          {child}
        </Animated.View>
      ))}
    </>
  );
}
