// How screens of the root stack arrive and leave (APK corrections #1 and #8,
// Nov 2026). The root stack is the JavaScript stack (expo-router/js-stack) so
// every transition can be tuned on both platforms and runs on the native
// driver in both directions (the native stack fixes Android's durations and
// can't scale a screen out when the app itself goes back). Three styles, so
// moving around the app doesn't feel the same everywhere:
// - "push": the iOS push: the new screen slides in from the right over the
//   old one, which drifts left and dims slightly. Most screens and flows.
// - "scale": the screen grows in from 92% while fading in, and going back
//   shrinks it to 96% while fading out. Shopping destinations: a product, a
//   farm, all farms, a category, an order.
// - "lift": the screen rises a few points while fading in. Settings, help,
//   legal, support, messages, alerts.
// One curve (APPLE_EASE) and 220-300 ms throughout. With the phone's "reduce
// motion" setting on, every screen simply cross-fades.
import { useState, type ReactNode } from "react";
import { Animated, Platform } from "react-native";
import { CardStyleInterpolators, type StackCardStyleInterpolator, type StackNavigationOptions } from "expo-router/js-stack";
import { APPLE_EASE, transition } from "@/theme/navigation";
import { colors } from "@/theme/tokens";

export type ScreenMotion = "push" | "scale" | "lift";

const SCALE_ROUTES = [/^product\//, /^farm\/\[id\]$/, /^farms$/, /^category\//, /^order\/\[id\]\/index$/, /^order-placed\//];
const LIFT_ROUTES = [
  /^settings\//,
  /^legal\//,
  /^support\//,
  /^farm-settings\//,
  /^(help|about|how-it-works|messages|farm-messages|notifications|saved|find-order)$/,
  /^farm\/(reviews|transactions|payout-account)$/,
  /^(order|farm-order)\/\[id\]\/chat$/,
];

/** Which arrival a route of the root stack gets, by its file name ("product/[id]"). */
export function motionFor(routeName: string): ScreenMotion {
  if (SCALE_ROUTES.some((r) => r.test(routeName))) return "scale";
  if (LIFT_ROUTES.some((r) => r.test(routeName))) return "lift";
  return "push";
}

const timing = (duration: number) => ({ animation: "timing", config: { duration, easing: APPLE_EASE } }) as const;
const clamp = "clamp" as const;

/**
 * Scale: 0.92 -> 1 with a quick fade in; going back, 1 -> 0.96 while fading
 * out. Only the moving screen animates; the one underneath stays still, so no
 * edge of the window ever shows around a shrunken page.
 */
const forScale: StackCardStyleInterpolator = ({ current: { progress }, closing }) => {
  const openScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1], extrapolate: clamp });
  const closeScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1], extrapolate: clamp });
  // Arriving, the page is fully opaque by mid-way so the grow reads as one motion
  const openOpacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: clamp });
  // closing is 0 or 1, so this picks one curve or the other (native-driver safe)
  const pick = (open: Animated.AnimatedInterpolation<number>, close: Animated.AnimatedInterpolation<number>) =>
    Animated.add(open, Animated.multiply(closing, Animated.subtract(close, open)));
  return {
    cardStyle: {
      opacity: pick(openOpacity, progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: clamp })),
      transform: [{ scale: pick(openScale, closeScale) }],
    },
  };
};

/** Lift: rises 4% of the screen height while fading in; the reverse going back. */
const forLift: StackCardStyleInterpolator = ({ current: { progress }, layouts: { screen } }) => ({
  cardStyle: {
    opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1], extrapolate: clamp }),
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [screen.height * 0.04, 0], extrapolate: clamp }) }],
  },
});

/** Sign-in rises from the bottom over the screen you were on; swipe down to close on iPhone. */
const forSheet: StackCardStyleInterpolator = CardStyleInterpolators.forVerticalIOS;

const base: StackNavigationOptions = { headerShown: false, cardStyle: { backgroundColor: colors.white } };

const TRANSITIONS: Record<ScreenMotion, StackNavigationOptions> = {
  push: {
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
    transitionSpec: { open: timing(transition.open), close: timing(transition.close) },
    gestureDirection: "horizontal",
    cardOverlayEnabled: true,
  },
  scale: {
    cardStyleInterpolator: forScale,
    transitionSpec: { open: timing(transition.scaleOpen), close: timing(transition.scaleClose) },
    gestureDirection: "horizontal",
    cardOverlayEnabled: false,
  },
  lift: {
    cardStyleInterpolator: forLift,
    transitionSpec: { open: timing(transition.open - 40), close: timing(transition.close - 40) },
    gestureDirection: "horizontal",
    cardOverlayEnabled: false,
  },
};

const crossFade: StackNavigationOptions = {
  cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
  transitionSpec: { open: timing(transition.fade), close: timing(transition.fade) },
  cardOverlayEnabled: false,
};

/** Root-stack options for a route: its arrival style, or a plain cross-fade with reduce motion on. */
export function rootScreenOptions(routeName: string, reduceMotion: boolean): StackNavigationOptions {
  // The browser preview keeps screen changes instant, as before
  if (Platform.OS === "web") return { ...base, animation: "none" };
  return { ...base, ...(reduceMotion ? crossFade : TRANSITIONS[motionFor(routeName)]) };
}

/** Swapping whole sections (splash -> home, shopping <-> farmer mode): a quick cross-fade. */
export const sectionFade: StackNavigationOptions = Platform.OS === "web" ? {} : crossFade;

/** Sign-in screens rise from the bottom as a modal. */
export function modalRise(reduceMotion: boolean): StackNavigationOptions {
  if (Platform.OS === "web" || reduceMotion) return { presentation: "modal", ...(Platform.OS === "web" ? {} : crossFade) };
  return {
    presentation: "modal",
    cardStyleInterpolator: forSheet,
    transitionSpec: { open: timing(transition.open + 40), close: timing(transition.close) },
    gestureDirection: "vertical",
    cardOverlayEnabled: true,
  };
}

/* ---------- When each screen arrived (used by reveal.tsx) ---------- */

// Route key -> when that screen first appeared. Root-stack screens are noted
// as they mount (below); a nested screen (a tab, a sign-in step) is noted the
// first time anything on it reveals.
const arrivals = new Map<string, number>();

/** When the screen with this route key arrived, noting it now if it's new. */
export function arrivalOf(routeKey: string): number {
  const known = arrivals.get(routeKey);
  if (known !== undefined) return known;
  const now = Date.now();
  // Forget long-gone screens so the map stays small
  if (arrivals.size > 200) arrivals.clear();
  arrivals.set(routeKey, now);
  return now;
}

/** Wraps each root-stack screen (app/_layout.tsx screenLayout) and notes when it arrived. */
export function ScreenMotionLayout({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  useState(() => arrivalOf(routeKey));
  return <>{children}</>;
}
