import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScreenWidth } from "./useScreenSize";

// Every Figma frame is 390 x 844 (iPhone 13/14), with a 47pt status bar.
export const FRAME_WIDTH = 390;
const FRAME_STATUS_BAR = 47;

/**
 * Lays a screen out as a scaled copy of its Figma frame, for full-bleed
 * screens that must match the design exactly (onboarding, splash).
 *
 * `x(n)` / `size(n)` scale a Figma measurement to this phone's width; `y(n)`
 * also swaps the frame's status bar for this phone's real top inset.
 */
export function useFigmaFrame() {
  const width = useScreenWidth();
  const insets = useSafeAreaInsets();
  const s = width / FRAME_WIDTH;
  const offsetY = insets.top - FRAME_STATUS_BAR * s;
  return {
    scale: s,
    x: (n: number) => n * s,
    y: (n: number) => n * s + offsetY,
    size: (n: number) => n * s,
  };
}
