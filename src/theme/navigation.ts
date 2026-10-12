// Screen-to-screen motion, shared by every navigator so the whole app moves
// the same way. All of these run natively, off the JS thread.
import { Platform } from "react-native";
import { motion } from "./tokens";

/**
 * Pushing a screen onto a stack. Android's stock slide is abrupt, so it uses
 * the native iOS-style slide; iOS keeps its own.
 */
export const pushAnimation = Platform.OS === "android" ? ("ios_from_right" as const) : ("default" as const);

/** Options for every stack: no header, white behind, the push animation above. */
export const stackScreenOptions = {
  headerShown: false,
  animation: pushAnimation,
} as const;

/** Swapping whole sections (splash → home, shopping ↔ farmer mode): a quick fade. */
export const sectionFade = { animation: "fade", animationDuration: 200 } as const;

/** Sign-in screens rise from the bottom as a modal. */
export const modalRise = { presentation: "modal", animation: "slide_from_bottom", animationDuration: motion.base } as const;

/** Switching tabs: a short cross-fade. */
export const tabTransition = {
  animation: "fade",
  transitionSpec: { animation: "timing", config: { duration: 160 } },
} as const;
