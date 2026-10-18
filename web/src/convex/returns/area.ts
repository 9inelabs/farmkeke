// Shapes read by the area picker (W-09, W-09b, W-10). ServiceArea is in common.ts.

/** areas.matchLocation */
export type LocationMatch =
  | { kind: "served"; area: { _id: string; name: string; lga: string; state: string } }
  | {
      kind: "outside";
      nearestPickupPoint: { _id: string; name: string; address: string; distanceKm: number } | null;
    };

/** areas.listPickupPoints (only the fields the picker reads) */
export type PickupPointLite = { _id: string; name: string; lga: string; state: string; active: boolean };
