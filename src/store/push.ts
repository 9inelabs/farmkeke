// Push state on this phone: the permission as last read, the token and who
// it's registered to, and whether each side's primer (M-48, F-12) was shown.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PushStatus } from "@/features/push/push";

type PushStore = {
  status: PushStatus | null;
  token: string | null;
  /** The person the token is registered to on the server */
  tokenUserId: string | null;
  primerSeen: { shop: boolean; farm: boolean };
  setStatus: (status: PushStatus) => void;
  setRegistered: (token: string | null, userId: string | null) => void;
  markPrimerSeen: (side: "shop" | "farm") => void;
};

export const usePush = create<PushStore>()(
  persist(
    (set) => ({
      status: null,
      token: null,
      tokenUserId: null,
      primerSeen: { shop: false, farm: false },
      setStatus: (status) => set({ status }),
      setRegistered: (token, tokenUserId) => set({ token, tokenUserId }),
      markPrimerSeen: (side) => set((s) => ({ primerSeen: { ...s.primerSeen, [side]: true } })),
    }),
    {
      name: "farmkeke-push",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ token, tokenUserId, primerSeen }) => ({ token, tokenUserId, primerSeen }),
    },
  ),
);
