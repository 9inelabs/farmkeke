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
};

const store = createLocalStore<ChosenArea | null>("fk.area.v1", null);

export const area = {
  set: (a: ChosenArea | null) => store.set(a),
  get: store.get,
  use: store.use,
};

// Area picker (W-09) open state, shared by the header, shop and checkout.
const picker = createMemoryStore<boolean>(false);
export const areaPicker = {
  open: () => picker.set(true),
  close: () => picker.set(false),
  useOpen: picker.use,
};
