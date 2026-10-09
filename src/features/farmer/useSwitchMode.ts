import { router } from "expo-router";
import { useCallback } from "react";
import { usePrefs } from "@/store/prefs";

/** Moves between shopping and farmer mode (F-13). Cart and orders are kept. */
export function useSwitchMode() {
  const setMode = usePrefs((s) => s.setMode);
  return useCallback(
    (mode: "shop" | "farm") => {
      setMode(mode);
      if (router.canDismiss()) router.dismissAll();
      router.replace(mode === "farm" ? "/dashboard" : "/home");
    },
    [setMode],
  );
}
