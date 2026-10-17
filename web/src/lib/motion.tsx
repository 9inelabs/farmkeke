"use client";

// Farmkeke motion: quick, subtle, never in the way.
// - Durations: 150ms small feedback, 250ms most transitions, 350ms max.
// - Ease-out by default. Only opacity and transform are animated.
// - Respects the device's reduce-motion setting (MotionConfig reducedMotion="user").
// - Nothing is hidden in server HTML: content that is already on screen never
//   waits for JavaScript to appear, so slow phones still see the page at once.
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useInView,
  useReducedMotion,
  type HTMLMotionProps,
  type Transition,
} from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export { AnimatePresence, m, useReducedMotion };

export const duration = { fast: 0.15, base: 0.25, slow: 0.35 } as const;
export const easeOut = [0.22, 1, 0.36, 1] as const;

export const transition = {
  fast: { duration: duration.fast, ease: easeOut },
  base: { duration: duration.base, ease: easeOut },
  slow: { duration: duration.slow, ease: easeOut },
} satisfies Record<string, Transition>;

/** Press feedback for buttons and tappable cards (150ms, transform only). */
export const pressable = {
  whileTap: { scale: 0.97 },
  transition: transition.fast,
} as const;

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={transition.base}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type FadeUpProps = HTMLMotionProps<"div"> & { delay?: number; distance?: number };

/**
 * Section fades up gently the first time it scrolls into view (once only).
 * Sections already visible on load are shown immediately, with no animation.
 */
export function FadeUp({ children, delay = 0, distance = 14, ...rest }: FadeUpProps) {
  const ref = useRef<HTMLDivElement>(null);
  // "Armed" only for sections that start below the fold, measured after hydration.
  const [armed, setArmed] = useState(false);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const hidden = armed && !inView;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight) setArmed(true);
  }, []);

  return (
    <m.div
      ref={ref}
      initial={false}
      animate={hidden ? { opacity: 0, y: distance } : { opacity: 1, y: 0 }}
      transition={hidden ? { duration: 0 } : { ...transition.slow, delay }}
      {...rest}
    >
      {children}
    </m.div>
  );
}

/** Content that arrives after loading (e.g. replacing a skeleton) fades in. */
export function Reveal({ children, ...rest }: HTMLMotionProps<"div">) {
  return (
    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition.base} {...rest}>
      {children}
    </m.div>
  );
}

/** Children appear one after another (order timelines, short lists). */
export function Stagger({ children, step = 0.05, ...rest }: HTMLMotionProps<"div"> & { step?: number }) {
  return (
    <m.div
      initial="hidden"
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: step } } }}
      {...rest}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({ children, ...rest }: HTMLMotionProps<"div">) {
  return (
    <m.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        shown: { opacity: 1, y: 0, transition: transition.base },
      }}
      {...rest}
    >
      {children}
    </m.div>
  );
}

// Page transitions run only on in-app navigation, never on the first load.
let hasNavigated = false;

export function PageTransition({ children }: { children: ReactNode }) {
  const [animate] = useState(() => hasNavigated);
  useEffect(() => {
    hasNavigated = true;
  }, []);
  return (
    <m.div
      initial={animate ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.base}
    >
      {children}
    </m.div>
  );
}
