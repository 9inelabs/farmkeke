"use client";

// The shopper's chosen service area ("Deliver to Owerri North" in the header).
// Chosen in the W-09 area picker, matched by GPS via api.areas.matchLocation
// (W-10 primer), and used for delivery fees at checkout.
import { createLocalStore, createMemoryStore } from "./local-store";

export type ChosenArea = {
  /** serviceAreas id */
  id: string;
  name: string;
  lga: string;
  state: string;
  /**
   * Where distances to farms are measured from: the exact GPS position when
   * "Use my location" was used, otherwise the service area's centre.
   * Optional: values saved before these existed don't have them.
   */
  latitude?: number;
  longitude?: number;
};

const store = createLocalStore<ChosenArea | null>("fk.area.v1", null);

export const area = {
  set: (a: ChosenArea | null) => store.set(a),
  get: store.get,
  use: store.use,
};

/** The chosen area's position as storefront `lat`/`lng` args, or undefined when not known. */
export function areaPoint(a: ChosenArea | null | undefined): { lat: number; lng: number } | undefined {
  if (!a || typeof a.latitude !== "number" || typeof a.longitude !== "number") return undefined;
  if (!Number.isFinite(a.latitude) || !Number.isFinite(a.longitude)) return undefined;
  return { lat: a.latitude, lng: a.longitude };
}

// Area picker (W-09) open state, shared by the header, shop and checkout.
const picker = createMemoryStore<boolean>(false);
export const areaPicker = {
  open: () => picker.set(true),
  close: () => picker.set(false),
  useOpen: picker.use,
};
