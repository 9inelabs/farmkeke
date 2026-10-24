// The header photo for each farmer sign-up screen: a different farm scene
// on each. Screens without a photo keep the lime band.
//
// To add one: put the photo in assets/sell/ (landscape, at least 1200px
// wide, JPEG around 150 KB), then map it here, e.g.
//   phone: require("../../../assets/sell/phone.jpg"),
import type { ImageSourcePropType } from "react-native";

export type SellScene = "intro" | "phone" | "code" | "pin" | "login" | "profile" | "bank" | "review" | "submitted";

export const SELL_IMAGES: Partial<Record<SellScene, ImageSourcePropType>> = {};
