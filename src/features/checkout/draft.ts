// What the shopper has filled in across checkout (M-39, M-33, M-34, M-41),
// kept on the phone so Back, edits and restarts keep it. Same shape as the
// website's draft. Pickup is at each farm and delivery times are agreed with
// the rider, so there's no pickup point or time slot to remember.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CheckoutDraft = {
  contact: { name: string; phone: string; email: string };
  fulfilment: "delivery" | "pickup" | null;
  address: {
    street: string;
    landmark: string;
    /** "Note for the rider", sent as checkout.place address.note */
    note: string;
    latitude?: number;
    longitude?: number;
  };
  /** The last pickup checkout placed from this draft and still unpaid; sent as `replaces`. */
  checkoutId: string | null;
  /** The last placed checkout, for M-47's "A rider delivers to …". */
  placed: { checkoutId: string; street?: string } | null;
};

type Store = CheckoutDraft & {
  patch: (p: Partial<CheckoutDraft>) => void;
  /** After placing (delivery) or paying (pickup): keep contact and address for next time, forget the rest. */
  finish: (placed: CheckoutDraft["placed"]) => void;
};

export const useCheckoutDraft = create<Store>()(
  persist(
    (set) => ({
      contact: { name: "", phone: "", email: "" },
      fulfilment: null,
      address: { street: "", landmark: "", note: "" },
      checkoutId: null,
      placed: null,
      patch: (p) => set(p),
      finish: (placed) => set({ checkoutId: null, placed }),
    }),
    {
      name: "farmkeke-checkout",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ contact, fulfilment, address, checkoutId, placed }) => ({ contact, fulfilment, address, checkoutId, placed }),
    },
  ),
);

export const draftNow = () => useCheckoutDraft.getState();
