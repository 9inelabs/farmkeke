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
