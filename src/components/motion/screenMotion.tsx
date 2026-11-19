// Three ways a screen arrives, so moving around the app doesn't feel the same
// everywhere (Nov 2026):
// - "rise": the content fades in and rises, piece by piece (tabs, sign-up,
//   checkout and most flows; the platform's own push underneath).
// - "scale": the whole screen fades in while growing from 94% (shopping
//   destinations: a product, a farm, all farms, a category, an order).
// - "slide": a sideways slide on both platforms, with the content gliding in
//   from the right (settings, help, legal, support, messages, alerts).
// Leaving mirrors arriving: scale screens fade out, slide screens slide out.
// All of it follows the phone's reduce-motion setting.
import { createContext, useContext, type ReactNode } from "react";
import { Platform, StyleSheet } from "react-native";
import Animated, { Easing, Keyframe, ReduceMotion } from "react-native-reanimated";

export type ScreenMotion = "rise" | "scale" | "slide";

const MotionContext = createContext<ScreenMotion>("rise");

/** The arrival style of the screen this component is in. */
export const useScreenMotion = () => useContext(MotionContext);

const SCALE_ROUTES = [/^product\//, /^farm\/\[id\]$/, /^farms$/, /^category\//, /^order\/\[id\]\/index$/, /^order-placed\//];
const SLIDE_ROUTES = [
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
  if (SLIDE_ROUTES.some((r) => r.test(routeName))) return "slide";
  return "rise";
}

/** The native stack transition that goes with each arrival. */
export function navigationFor(motion: ScreenMotion) {
  if (motion === "scale") return { animation: "fade", animationDuration: 220 } as const;
  if (motion === "slide") return { animation: "slide_from_right", animationDuration: 300 } as const;
  return {};
}

const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);

// The whole screen grows into place as the native fade brings it in.
const scaleIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.94 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
})
  .duration(340)
  .reduceMotion(ReduceMotion.System);

/** Wraps each root-stack screen (app/_layout.tsx screenLayout) with its arrival. */
export function ScreenMotionLayout({ routeName, children }: { routeName: string; children: ReactNode }) {
  const motion = motionFor(routeName);
  return (
    <MotionContext.Provider value={motion}>
      {motion === "scale" && Platform.OS !== "web" ? (
        <Animated.View entering={scaleIn} style={styles.fill}>
          {children}
        </Animated.View>
      ) : (
        children
      )}
    </MotionContext.Provider>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
