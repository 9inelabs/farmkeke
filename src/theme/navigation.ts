// Screen-to-screen motion, shared by every navigator so the whole app moves
// the same way: quick, with one Apple-like curve (fast start, long soft
// settle). All of it runs natively, off the JS thread. The root stack's three
// arrival styles (push, scale, lift) live in components/motion/screenMotion.tsx.
import { Easing, Platform } from "react-native";
import { Easing as ReanimatedEasing } from "react-native-reanimated";

/**
 * The app's one transition curve: the cubic-bezier iOS uses for sheets and
 * drawers. It starts quickly and settles gently, so screens feel instant
 * without snapping.
 */
export const APPLE_EASE = Easing.bezier(0.32, 0.72, 0, 1);

/** The same curve for Reanimated (worklet-safe), for in-screen motion. */
export const APPLE_EASE_UI = ReanimatedEasing.bezier(0.32, 0.72, 0, 1);

/** Durations (ms) for screen changes. Opening a little slower than closing, like iOS. */
export const transition = {
  open: 300,
  close: 240,
  scaleOpen: 280,
  scaleClose: 220,
  fade: 180,
} as const;

/**
 * Pushing a screen onto the nested native stacks (onboarding, sign-in):
 * iPhone keeps UIKit's own push, with swipe-from-the-edge to go back. Android
 * uses the iOS-style slide (200 ms, the old screen drifting left underneath)
 * instead of the system's 450 ms Material transition, which felt slow.
 */
export const pushAnimation = Platform.OS === "android" ? ("ios_from_right" as const) : ("default" as const);

/** Options for the nested native stacks: no header, the push animation above. */
export const stackScreenOptions = {
  headerShown: false,
  animation: pushAnimation,
} as const;

/** Switching tabs: a short cross-fade on the same curve. */
export const tabTransition = {
  animation: "fade",
  transitionSpec: { animation: "timing", config: { duration: 150, easing: APPLE_EASE } },
} as const;
