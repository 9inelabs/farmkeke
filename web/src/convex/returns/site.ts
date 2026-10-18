// Shapes read by the landing and information pages, from convex-spec/samples.

/** areas.listPickupPoints */
export type PickupPoint = {
  _id: string;
  name: string;
  address: string;
  lga: string;
  state: string;
  active: boolean;
  latitude?: number;
  longitude?: number;
  phone?: string;
  photoUrl?: string | null;
  collectWithinDays?: number;
  /** day: 0 = Sunday … 6 = Saturday; opens/closes "HH:MM" (Nigerian time) */
  hours?: Array<{ day: number; opens: string; closes: string }>;
};
