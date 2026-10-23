// M-13 recent searches, kept on this phone (newest first, at most 8).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const MAX = 8;

type Searches = {
  recent: string[];
  remember: (text: string) => void;
  clear: () => void;
};

export const useSearches = create<Searches>()(
  persist(
    (set) => ({
      recent: [],
      remember: (text) =>
        set((s) => {
          const t = text.trim();
          if (t.length < 2) return s;
          return { recent: [t, ...s.recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, MAX) };
        }),
      clear: () => set({ recent: [] }),
    }),
    { name: "farmkeke-searches", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
