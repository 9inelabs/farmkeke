// A-87 Site photos: the slots staff can fill from the Admin Portal.
import { v, type Infer } from "convex/values";

export const slotValidator = v.union(v.literal("signin"), v.literal("signup"));
export const focusValidator = v.union(v.literal("left"), v.literal("center"), v.literal("right"));
export type Slot = Infer<typeof slotValidator>;
export type Focus = Infer<typeof focusValidator>;

export const SLOTS: Slot[] = ["signin", "signup"];
