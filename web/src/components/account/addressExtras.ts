"use client";

// Rider directions and map pins for saved addresses. addresses.create/update
// don't take them yet (see BUILD-STATUS backend gaps), so they are kept on
// this device, keyed by address id, and used to prefill checkout here.
import { createLocalStore } from "@/lib/local-store";

export type AddressExtra = { directions?: string; latitude?: number; longitude?: number };

const store = createLocalStore<Record<string, AddressExtra>>("fk.addressExtras.v1", {});

export const addressExtras = {
  use: store.use,
  get: (id: string): AddressExtra | undefined => store.get()[id],
  set: (id: string, extra: AddressExtra) => store.set((all) => ({ ...all, [id]: extra })),
  remove: (id: string) =>
    store.set((all) => Object.fromEntries(Object.entries(all).filter(([key]) => key !== id))),
};
