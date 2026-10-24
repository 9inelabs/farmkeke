// What's at a GPS position: state, LGA and a street or place name. The
// phone's own geocoder first; in the browser preview (which has none) or
// when it comes back empty, OpenStreetMap's Nominatim, as the website uses.
import * as Location from "expo-location";
import { Platform } from "react-native";

export type FoundPlace = { region?: string; lga?: string; address?: string };

async function fromPhone(latitude: number, longitude: number): Promise<FoundPlace | null> {
  if (Platform.OS === "web") return null;
  const [found] = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
  if (!found) return null;
  return {
    region: found.region ?? undefined,
    lga: found.subregion ?? found.district ?? found.city ?? undefined,
    address: [found.streetNumber, found.street ?? found.name].filter(Boolean).join(" ") || undefined,
  };
}

async function fromNominatim(latitude: number, longitude: number): Promise<FoundPlace | null> {
  try {
    const qs = new URLSearchParams({ format: "jsonv2", zoom: "18", addressdetails: "1", "accept-language": "en", lat: String(latitude), lon: String(longitude) });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${qs.toString()}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const a = ((await res.json()) as { address?: Record<string, string | undefined> }).address ?? {};
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const area = a.neighbourhood ?? a.suburb ?? a.quarter ?? a.village ?? a.hamlet ?? a.town ?? a.city;
    return {
      region: a.state,
      lga: a.county ?? a.state_district ?? a.city ?? a.town,
      address: [street, area].filter(Boolean).join(", ") || undefined,
    };
  } catch {
    return null;
  }
}

export async function whereIs(latitude: number, longitude: number): Promise<FoundPlace> {
  const phone = await fromPhone(latitude, longitude);
  if (phone?.region && phone.lga && phone.address) return phone;
  const osm = await fromNominatim(latitude, longitude);
  return { region: phone?.region ?? osm?.region, lga: phone?.lga ?? osm?.lga, address: phone?.address ?? osm?.address };
}
