import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ChosenArea = {
  serviceAreaId: string;
  name: string;
  state: string;
  lga: string;
};

type Prefs = {
  /** M-03 carousel seen on this phone. */
  onboardingSeen: boolean;
  /** Delivery area for browsing (M-05 / M-06). Not a full address. */
  area: ChosenArea | null;
  /**
   * True while a real account (not a guest) is signed in on this phone.
   * If the session ends without the person signing out, M-S6 is shown.
   */
  accountSignedIn: boolean;
  /** Which side of the app is showing (F-13). Farmer mode needs an approved farm. */
  mode: "shop" | "farm";
  setOnboardingSeen: () => void;
  setMode: (mode: "shop" | "farm") => void;
  setArea: (area: ChosenArea) => void;
  setAccountSignedIn: (value: boolean) => void;
};

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      onboardingSeen: false,
      area: null,
      accountSignedIn: false,
      mode: "shop",
      setOnboardingSeen: () => set({ onboardingSeen: true }),
      setMode: (mode) => set({ mode }),
      setArea: (area) => set({ area }),
      setAccountSignedIn: (accountSignedIn) => set({ accountSignedIn }),
    }),
    {
      name: "farmkeke-prefs",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ onboardingSeen, area, accountSignedIn, mode }) => ({ onboardingSeen, area, accountSignedIn, mode }),
    },
  ),
);

/** True once saved preferences have been read from the phone. */
export function usePrefsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => usePrefs.persist.hasHydrated());
  useEffect(() => {
    if (usePrefs.persist.hasHydrated()) setHydrated(true);
    return usePrefs.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
