// Tab screens with a dark green top (the farm Dashboard, Messages) stay
// mounted when another tab shows, so a <StatusBar> inside them would keep
// winning. This sets white status-bar text only while the screen is in focus.
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useCallback } from "react";

export function useLightStatusBar() {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );
}
