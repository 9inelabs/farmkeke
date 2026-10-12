import { Platform, useWindowDimensions } from "react-native";

/**
 * On web the app is drawn in a centred, phone-width column (see the root
 * layout), so a desktop browser shows the phone layout instead of stretching
 * it. This is the widest that column gets.
 */
export const WEB_MAX_WIDTH = 430;

/**
 * The width screens should lay out against: the window on Android and iOS,
 * and the phone-width column on web.
 */
export function useScreenWidth(): number {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" ? Math.min(width, WEB_MAX_WIDTH) : width;
}
