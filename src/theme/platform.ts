// Which platform's habits the UI follows. The brand (colours, fonts, cards)
// is the same everywhere; the conventions people know from their phone are
// not: the back arrow, the tab bar, screen transitions, press feedback and
// small vibrations. iPhone and the browser preview follow Apple's style;
// Android follows Material. The browser preview can be shown the Android way
// with ?ui=android in the address (for checking designs; read once at start).
import { Platform } from "react-native";

const previewUi =
  Platform.OS === "web" && typeof window !== "undefined" && typeof window.location?.search === "string"
    ? new URLSearchParams(window.location.search).get("ui")
    : null;

/** Material conventions: Android phones, or the preview with ?ui=android. */
export const androidUi = Platform.OS === "android" || previewUi === "android";

/** Material's press feedback for rows and cards; iPhone dims them instead. */
export const ripple = androidUi ? { color: "rgba(30, 59, 22, 0.10)" } : undefined;
