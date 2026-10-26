// Per-weight imports: the packages' root entry bundles every weight and italic.
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Montserrat_600SemiBold } from "@expo-google-fonts/montserrat/600SemiBold";
import { Montserrat_700Bold } from "@expo-google-fonts/montserrat/700Bold";
import type { TextStyle } from "react-native";
import { colors } from "./tokens";

// Loaded once in the root layout; the keys are the fontFamily names below.
export const fontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
};

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  displaySemibold: "Montserrat_600SemiBold",
  displayBold: "Montserrat_700Bold",
} as const;

// Montserrat is for large display headings (onboarding, success and empty
// states); Inter is for screen titles, section titles and everything else,
// matching the Figma frames.
// A compact scale (26 Oct 2026): small, quiet section labels and modest
// headings, like the cleanest banking apps, so screens read as calm and
// uncluttered. Body text stays at 14 for comfortable reading.
export const type = {
  display: { fontFamily: fonts.displaySemibold, fontSize: 28, lineHeight: 34, color: colors.ink },
  displaySmall: { fontFamily: fonts.displaySemibold, fontSize: 21, lineHeight: 27, color: colors.ink },
  // Tab titles ("Settings & Support", "Orders")
  screenTitle: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2, color: colors.ink },
  // Titles beside the back chevron ("< Account")
  backTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1, color: colors.ink },
  title: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 25, color: colors.ink },
  // Section labels above cards ("Fresh Picks", "Needs your reply")
  section: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  heading: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, color: colors.ink },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  small: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 15, color: colors.inkMuted },
  overline: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.inkMuted,
  },
  price: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: colors.forest },
  priceLarge: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, color: colors.ink },
  button: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
