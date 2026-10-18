// Distances for the shop (W-01, W-03, W-04, W-06, W-07): haversine, in km.

const EARTH_RADIUS_KM = 6371;

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Point = { lat: number; lng: number };

/** The shopper's position from optional lat/lng args, or null when either is missing or invalid. */
export function shopperPoint(lat: number | undefined, lng: number | undefined): Point | null {
  if (lat === undefined || lng === undefined) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Km from the shopper to a farm, to one decimal place; null when either position is unknown. */
export function farmDistanceKm(
  from: Point | null,
  farm: { latitude?: number; longitude?: number },
): number | null {
  if (from === null || farm.latitude === undefined || farm.longitude === undefined) return null;
  return Math.round(haversineKm(from.lat, from.lng, farm.latitude, farm.longitude) * 10) / 10;
}
