// Shared shop UI state: the add-to-cart sheet (M-19) and the "Added to your
// cart" toast (M-20). Any product card or page opens the sheet; the shop
// layout draws both once.
import { create } from "zustand";

type ShopUi = {
  /** Listing whose add-to-cart sheet is open */
  addingId: string | null;
  /** "Fresh tomatoes" after an add, cleared when the toast hides */
  added: string | null;
  openAdd: (listingId: string) => void;
  closeAdd: () => void;
  showAdded: (name: string) => void;
  hideAdded: () => void;
};

export const useShopUi = create<ShopUi>()((set) => ({
  addingId: null,
  added: null,
  openAdd: (addingId) => set({ addingId }),
  closeAdd: () => set({ addingId: null }),
  showAdded: (added) => set({ added }),
  hideAdded: () => set({ added: null }),
}));
