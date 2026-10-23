import { memo } from "react";
import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "@/theme/tokens";
import { glyphs, type GlyphName, type Shape } from "./glyphs";

export type IconProps = {
  size?: number;
  color?: ColorValue;
  /** Line weight at 24px. The set is drawn at 1.5. */
  strokeWidth?: number;
  /** Any fill other than "none" switches to the solid style (saved hearts, rated stars). */
  fill?: ColorValue;
  variant?: "line" | "solid";
  accessibilityLabel?: string;
};

export type IconComponent = (props: IconProps) => React.ReactElement;

function draw(shapes: readonly Shape[], color: ColorValue, strokeWidth: number) {
  return shapes.map(([d, mode, opacity], i) => (
    <Path
      key={i}
      d={d}
      opacity={opacity}
      fill={mode === "s" ? "none" : color}
      stroke={mode === "f" ? undefined : color}
      strokeWidth={mode === "f" ? undefined : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ));
}

function glyph(name: GlyphName): IconComponent {
  const Icon = memo(function Icon({ size = 24, color = colors.ink, strokeWidth = 1.5, fill, variant, accessibilityLabel }: IconProps) {
    const solid = variant === "solid" || (fill !== undefined && fill !== "none" && fill !== "transparent");
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={accessibilityLabel !== undefined} accessibilityLabel={accessibilityLabel}>
        {draw(solid ? glyphs[name].b : glyphs[name].l, color, strokeWidth)}
      </Svg>
    );
  });
  return Icon as unknown as IconComponent;
}

// Simple marks Iconsax doesn't have, drawn on the same 24px grid and line weight.
function drawn(shapes: readonly Shape[], solidShapes: readonly Shape[] = shapes): IconComponent {
  const Icon = memo(function Icon({ size = 24, color = colors.ink, strokeWidth = 1.5, fill, variant, accessibilityLabel }: IconProps) {
    const solid = variant === "solid" || (fill !== undefined && fill !== "none" && fill !== "transparent");
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={accessibilityLabel !== undefined} accessibilityLabel={accessibilityLabel}>
        {draw(solid ? solidShapes : shapes, color, strokeWidth)}
      </Svg>
    );
  });
  return Icon as unknown as IconComponent;
}

export const Close = drawn([["M6.5 6.5l11 11M17.5 6.5l-11 11", "s"]]);
export const Check = drawn([["M5 12.5l4.5 4.5L19 7.5", "s"]]);
export const Circle = drawn([["M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z", "s"]]);
export const Sprout = drawn(
  [
    ["M12 21v-8.5", "s"],
    ["M12 12.5C12 8.9 9.6 6.5 5 6.5c0 3.6 2.4 6 7 6Z", "s"],
    ["M12 10.5c0-3.4 2.3-6 6.5-6 0 3.4-2.3 6-6.5 6Z", "s"],
    ["M8 21h8", "s"],
  ],
  [
    ["M12 21v-8.5M8 21h8", "s"],
    ["M12 12.5C12 8.9 9.6 6.5 5 6.5c0 3.6 2.4 6 7 6Z", "sf"],
    ["M12 10.5c0-3.4 2.3-6 6.5-6 0 3.4-2.3 6-6.5 6Z", "sf"],
  ],
);
export const Leaf = drawn([
  ["M5 19C5 10.5 10 5.5 20 4c-.9 10-6 15-15 15Z", "s"],
  ["M5 19l7.5-7.5", "s"],
]);
export const Bike = drawn([
  ["M5.5 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18.5 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "s"],
  ["M5.5 17l3.5-6h5.5l4 6M14.5 11l-1.5-4.5h2.5M9 11 7.5 8H5", "s"],
]);

export const CheckCircle = glyph("TickCircle");
export const CloseCircle = glyph("CloseCircle");
export const Shop = glyph("Shop");
export const Truck = glyph("Truck");
export const TruckFast = glyph("TruckFast");
export const Mail = glyph("Sms");
export const MailSent = glyph("SmsTracking");
export const Pin = glyph("Location");
export const PinCheck = glyph("LocationTick");
export const Lock = glyph("Lock");
export const Info = glyph("InfoCircle");
export const Warning = glyph("Warning2");
export const Danger = glyph("Danger");
export const Document = glyph("DocumentText");
export const DocumentCheck = glyph("TickSquare");
export const DocumentAlert = glyph("DocumentForward");
export const Clock = glyph("Clock");
export const Timer = glyph("Timer1");
export const ChevronDown = glyph("ArrowDown2");
export const ChevronUp = glyph("ArrowUp2");
export const ChevronLeft = glyph("ArrowLeft2");
export const ChevronRight = glyph("ArrowRight2");
export const ArrowRight = glyph("ArrowRight");
export const ArrowRightCircle = glyph("ArrowSquareRight");
export const Trash = glyph("Trash");
export const Verified = glyph("Verify");
export const Basket = glyph("Bag2");
export const Bag = glyph("Bag");
export const Cart = glyph("ShoppingCart");
export const BagCross = glyph("BagCross");
export const Search = glyph("SearchNormal1");
export const SearchOff = glyph("SearchStatus");
export const Refresh = glyph("Refresh2");
export const Undo = glyph("RotateLeft");
export const Edit = glyph("Edit2");
export const Offline = glyph("WifiSquare");
export const User = glyph("Profile");
export const People = glyph("People");
export const Star = glyph("Star1");
export const Box = glyph("Box");
export const BoxOpen = glyph("Box1");
export const BoxRemove = glyph("BoxRemove");
export const Orders = glyph("DirectboxDefault");
export const Clipboard = glyph("ClipboardText");
export const Receipt = glyph("ReceiptText");
export const Wallet = glyph("EmptyWallet");
export const WalletCards = glyph("Wallet3");
export const Cash = glyph("Money");
export const CashIn = glyph("MoneyRecive");
export const Card = glyph("Card");
export const Bank = glyph("Bank");
export const Break = glyph("Sun1");
export const Key = glyph("Key");
export const Home = glyph("Home2");
export const Heart = glyph("Heart");
export const Eye = glyph("Eye");
export const EyeOff = glyph("EyeSlash");
export const Camera = glyph("Camera");
export const Bell = glyph("Notification");
export const Tools = glyph("Setting2");
export const Sliders = glyph("Setting4");
export const Phone = glyph("Mobile");
export const Call = glyph("Call");
export const Chat = glyph("MessageText1");
export const ShieldCheck = glyph("ShieldTick");
export const Play = glyph("Play");
export const Pause = glyph("Pause");
export const Celebrate = glyph("Happyemoji");
export const Gift = glyph("Gift");
export const Logout = glyph("Logout");
export const Lightbulb = glyph("LampOn");
export const Grid = glyph("Category");
export const Dashboard = glyph("Element3");
export const Image = glyph("Gallery");
export const ImageAdd = glyph("GalleryAdd");
export const IdCard = glyph("Personalcard");
export const Download = glyph("ImportCurve");
export const Help = glyph("MessageQuestion");
export const Calendar = glyph("Calendar");
export const Briefcase = glyph("Briefcase");
export const Book = glyph("Book1");
export const Ban = glyph("Forbidden");
export const External = glyph("ExportSquare");
export const Plus = glyph("Add");
export const Minus = glyph("Minus");
export const Route = glyph("Routing");
export const Globe = glyph("Global");
export const Tree = glyph("Tree");
