"use client";

// W-S5 Connection lost. Mounted in the root layout.
// Watches the device's connection (navigator.onLine + online/offline events)
// and the live Convex connection. Nothing shows for the first few seconds after
// load or for brief blips: a problem must last about 3 seconds first.
// Shows the design's top strip and bottom card; both are polite live regions.
import { useConvexConnectionState } from "convex/react";
import { Loader2, WifiOff } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, m, transition } from "@/lib/motion";

type Problem = "offline" | "server";

/** How long a problem must last before we mention it. */
const DELAY_MS = 3000;
/** Grace period for the first connection after the page loads. */
const FIRST_CONNECT_MS = 8000;

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

const copy: Record<Problem, { strip: string; title: string; body: string }> = {
  offline: {
    strip: "You're offline. Some things may not load until you're back online.",
    title: "No internet connection",
    body: "Your cart is saved on this device. We'll reconnect automatically.",
  },
  server: {
    strip: "We can't reach Farmkeke right now. Some things may not load until we reconnect.",
    title: "Trouble connecting to Farmkeke",
    body: "Your cart is saved on this device. We'll reconnect automatically.",
  },
};

export function ConnectionStatus() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const conn = useConvexConnectionState();

  const [firstConnectOver, setFirstConnectOver] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setFirstConnectOver(true), FIRST_CONNECT_MS);
    return () => window.clearTimeout(t);
  }, []);

  const socketDown = conn.hasEverConnected ? !conn.isWebSocketConnected : firstConnectOver;
  const problem: Problem | null = !online ? "offline" : socketDown ? "server" : null;

  const [checking, setChecking] = useState(false);
  const [stillDown, setStillDown] = useState(false);

  // What is on screen. Appears only after the problem has lasted DELAY_MS;
  // goes away as soon as the connection is back.
  const [shown, setShown] = useState<Problem | null>(null);
  useEffect(() => {
    if (problem === shown) return;
    const wait = problem && !shown ? DELAY_MS : 0;
    const t = window.setTimeout(() => {
      setShown(problem);
      if (!problem) setStillDown(false);
    }, wait);
    return () => window.clearTimeout(t);
  }, [problem, shown]);

  // "Try again": the browser and Convex already retry on their own, so this
  // re-checks and tells the person what we found.
  useEffect(() => {
    if (!checking) return;
    const t = window.setTimeout(() => {
      setChecking(false);
      setStillDown(true);
    }, 1500);
    return () => window.clearTimeout(t);
  }, [checking]);

  const tryAgain = () => {
    setStillDown(false);
    setChecking(true);
  };

  const text = shown ? copy[shown] : null;

  return (
    <AnimatePresence>
      {text ? (
        <m.div key="strip" className="fixed inset-x-0 top-0 z-[55]" initial={{ opacity: 0, y: -48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -48 }} transition={transition.base}>
          <div
            role="status"
            aria-live="polite"
            className="flex min-h-12 items-center justify-center gap-2.5 bg-ink-3 px-4 py-2 text-center text-sm font-medium text-white"
          >
            <WifiOff aria-hidden className="size-[18px] flex-none" />
            {text.strip}
          </div>
        </m.div>
      ) : null}
      {text ? (
        <m.div
          key="card"
          className="fixed bottom-9 left-1/2 z-[55] w-[560px] max-w-[calc(100%-32px)] m:bottom-[calc(16px+env(safe-area-inset-bottom))]"
          initial={{ opacity: 0, x: "-50%", y: 16 }}
          animate={{ opacity: 1, x: "-50%", y: 0 }}
          exit={{ opacity: 0, x: "-50%", y: 16 }}
          transition={transition.base}
        >
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-4 rounded-[20px] bg-surface px-[22px] py-5 shadow-[inset_0_0_0_1px_var(--color-line),0_24px_60px_rgba(30,59,22,0.18)] m:flex-wrap m:gap-3 m:px-4 m:py-4"
          >
            <span className="tile bg-grey-bg text-ink-3" aria-hidden>
              <WifiOff className="size-[22px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">{text.title}</div>
              <div className="p mt-0.5 text-[13px] leading-[19px]">
                {stillDown ? "Still not connected. We'll keep trying in the background." : text.body}
              </div>
            </div>
            <button type="button" className="btn sm lime m:w-full" onClick={tryAgain} disabled={checking} aria-busy={checking || undefined}>
              {checking ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              Try again
            </button>
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
