// Screen-to-screen motion, shared by every navigator so the whole app moves
// the same way. All of these run natively, off the JS thread.
import { motion } from "./tokens";

/**
 * Pushing a screen onto a stack: each platform's own. iPhone slides in from
 * the right, with swipe-from-the-edge to go back; Android uses the system's
 * Material transition, which its users know from every other app.
 */
export const pushAnimation = "default" as const;

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
