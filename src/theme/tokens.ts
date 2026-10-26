// Design tokens taken from the Farmkeke Figma frames (390 x 844) and the PRD
// palette. Every screen uses these; avoid raw values in components.

export const colors = {
  forest: "#1E3B16",
  lime: "#A9D654",
  tint: "#F2F8E6",
  // Lime deep enough to read as small text on white (links, "See all")
  limeInk: "#6E9F24",
  white: "#FFFFFF",
  ink: "#1A1A1A",
  // Figma uses ink at 70% / 50% opacity for secondary and tertiary text
  inkSoft: "rgba(26, 26, 26, 0.7)",
  inkMuted: "rgba(26, 26, 26, 0.5)",
  // Forest at 30%: placeholder text and inactive icons
  forestFaint: "rgba(30, 59, 22, 0.3)",
  line: "#DFDFDF",
  placeholder: "#D9D9D9",
  surfaceMuted: "#F7F7F7",
  // Grouped rows and cards on white (recent searches, cart lines)
  surfaceSoft: "#F5F5F5",
  // Screens with cards on them (cart): the cards are white
  canvas: "#F8F8F8",
  stepperTrack: "#EFEEEE",
  // Scrim behind bottom sheets (Figma: #2C2C2C at 76%)
  scrim: "rgba(44, 44, 44, 0.76)",
  // Product card fill: tint at 25%
  cardFill: "rgba(242, 248, 230, 0.25)",
  success: "#2F9E44",
  error: "#D64545",
  // "Remove" in the cart
  danger: "#E5333A",
  info: "#1D7FE0",
  infoSoft: "#E8F2FD",
  pending: "#E6A23C",
  // Readable text on pendingSoft (amber on light amber)
  pendingInk: "#9A6412",
  // Notification badge red (Alerts pill)
  badge: "#E90303",
  successSoft: "#E6F4E9",
  errorSoft: "#FBEAEA",
  pendingSoft: "#FDF3E3",
} as const;

export const spacing = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  // Horizontal screen margin in every Figma frame
  screen: 20,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  // Buttons and input fields
  control: 17,
  pill: 999,
} as const;

export const borders = {
  // Figma hairlines are 0.4–0.5pt
  hairline: 0.5,
} as const;

export const sizes = {
  buttonHeight: 42,
  buttonHeightLarge: 48,
  inputHeight: 50,
  searchHeight: 46,
  chipHeight: 32,
  categoryTile: 56,
  addButton: 28,
  tabBarHeight: 58,
  headerIconHit: 44,
} as const;

// Motion tokens from the Farmkeke Design System (PRD): ease-out by default.
export const motion = {
  fast: 150,
  base: 250,
  slow: 350,
} as const;

export const shadow = {
  // Soft lift for floating controls (tab bar, sheets, photo badges)
  raised: {
    shadowColor: "#1A1A1A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;
