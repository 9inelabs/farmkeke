// Shapes read by the area picker (W-09, W-09b, W-10). ServiceArea is in common.ts.

/** areas.matchLocation */
export type LocationMatch =
  | { kind: "served"; area: { _id: string; name: string; lga: string; state: string } }
  | {
      kind: "outside";
      /** Always null now: pickup is at the farm */
      nearestPickupPoint: null;
    };

