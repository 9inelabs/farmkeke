// Shared shop UI state: the add-to-cart sheet (M-19). Any product card or
// page opens it; the root layout draws it once. The "Added to your cart"
// message (M-20) is the app toast (src/store/toast.ts).
import { create } from "zustand";

type ShopUi = {
  /** Listing whose add-to-cart sheet is open */
  addingId: string | null;
  openAdd: (listingId: string) => void;
  closeAdd: () => void;
};

export const useShopUi = create<ShopUi>()((set) => ({
  addingId: null,
  openAdd: (addingId) => set({ addingId }),
  closeAdd: () => set({ addingId: null }),
}));
