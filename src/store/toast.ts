// The app's one toast (the "Island" message at the top). Anything can show a
// short confirmation with an optional link; a new one replaces the current
// one in place. ToastHost in the root layout draws it and hides it after a
// few seconds.
import type { Href } from "expo-router";
import { create } from "zustand";

export type Toast = {
  id: number;
  message: string;
  tone: "success" | "info" | "error";
  /** A link ("View cart") or an action ("Undo"). */
  action?: { label: string; href?: Href; onPress?: () => void };
};

type ToastStore = {
  current: Toast | null;
  show: (toast: Omit<Toast, "id" | "tone"> & { tone?: Toast["tone"] }) => void;
  hide: () => void;
};

let nextId = 1;

export const useToast = create<ToastStore>()((set) => ({
  current: null,
  show: (toast) => set({ current: { tone: "success", ...toast, id: nextId++ } }),
  hide: () => set({ current: null }),
}));

/** For code outside React components (stores, callbacks). */
export const showToast = (toast: Parameters<ToastStore["show"]>[0]) => useToast.getState().show(toast);
