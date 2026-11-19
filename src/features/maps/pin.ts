// M-35 drop-off pin: shared pieces for the map picker (PinPicker.tsx) and the
// location-only fallback (PinPicker.web.tsx, and Android builds without a
// Google Maps key).
import Constants from "expo-constants";
import * as Location from "expo-location";
import { Platform } from "react-native";

export type Coords = { latitude: number; longitude: number };

/** Owerri, where Farmkeke starts: the map opens here when nothing better is known. */
export const OWERRI: Coords = { latitude: 5.4836, longitude: 7.0333 };

/** iOS uses Apple Maps (no key); Android needs the Google Maps key set at build time (app.config.js). */
export const mapAvailable =
  Platform.OS === "ios" || (Platform.OS === "android" && (Constants.expoConfig?.extra as { androidMaps?: boolean } | undefined)?.androidMaps === true);

/** Where the phone is now, asking for location if needed. A message instead when it can't. */
export async function locate(): Promise<{ coords: Coords } | { error: string }> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return { error: "Location is off for Farmkeke. The rider will use your address and landmark." };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } };
  } catch {
    return { error: "We couldn't get your location. The rider will use your address and landmark." };
  }
}

/** Where to open the map: the saved pin, else the last known position (if allowed already), else Owerri. */
export async function startingPoint(value: Coords | undefined): Promise<Coords> {
  if (value) return value;
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (granted) {
      const last = await Location.getLastKnownPositionAsync();
      if (last) return { latitude: last.coords.latitude, longitude: last.coords.longitude };
    }
  } catch {
    // Fall through to Owerri
  }
  return OWERRI;
}

export const pinSubtitle = (value: Coords | undefined, note: string | null) =>
  note ?? (value ? "Drop-off pin set. The rider will come to this spot." : "Optional. Helps the rider find the exact gate.");
