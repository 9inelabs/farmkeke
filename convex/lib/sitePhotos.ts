// A-87 Site photos: the slots staff can fill from the Admin Portal. The
// website's sign-in and sign-up panels, and (24 Oct 2026) the header photo of
// each screen in the app's farmer sign-up.
import { v, type Infer } from "convex/values";

export const slotValidator = v.union(
  v.literal("signin"),
  v.literal("signup"),
  v.literal("farmer_intro"),
  v.literal("farmer_phone"),
  v.literal("farmer_code"),
  v.literal("farmer_pin"),
  v.literal("farmer_login"),
  v.literal("farmer_profile"),
  v.literal("farmer_bank"),
  v.literal("farmer_review"),
  v.literal("farmer_submitted"),
);
export const focusValidator = v.union(v.literal("left"), v.literal("center"), v.literal("right"));
export type Slot = Infer<typeof slotValidator>;
export type Focus = Infer<typeof focusValidator>;

/** The website's panels (sitePhotos.auth) */
export const SLOTS: Slot[] = ["signin", "signup"];

/** The app's farmer sign-up screens, in the order a farmer meets them (sitePhotos.farmerSignup) */
export const FARMER_SCENES = ["intro", "phone", "code", "pin", "profile", "bank", "review", "submitted", "login"] as const;
export type FarmerScene = (typeof FARMER_SCENES)[number];
export const farmerSlot = (scene: FarmerScene) => `farmer_${scene}` as Slot;

/** Every slot, website first, for the Admin Portal */
export const ALL_SLOTS: Slot[] = [...SLOTS, ...FARMER_SCENES.map(farmerSlot)];

const FOCUS_X: Record<Focus, number> = { left: 0, center: 50, right: 100 };
const clampPct = (n: number) => Math.min(100, Math.max(0, Math.round(n * 10) / 10));

/** The point to keep in view, in % (0 to 100) across and down the photo. */
export function photoPosition(row: { focus: Focus; focusX?: number; focusY?: number }) {
  return { x: clampPct(row.focusX ?? FOCUS_X[row.focus]), y: clampPct(row.focusY ?? 50) };
}

/** Left / middle / right closest to a point, for app builds that only read `focus`. */
export function focusFromX(x: number): Focus {
  return x < 34 ? "left" : x > 66 ? "right" : "center";
}

export { clampPct };
