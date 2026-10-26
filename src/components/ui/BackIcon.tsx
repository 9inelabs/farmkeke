import { ArrowLeft, ChevronLeft } from "@/components/icons";
import { androidUi } from "@/theme/platform";
import { colors } from "@/theme/tokens";

/** The back mark: a chevron on iPhone, Material's arrow on Android. */
export function BackIcon({ color = colors.ink, size }: { color?: string; size?: number }) {
  return androidUi ? <ArrowLeft size={size ?? 22} color={color} strokeWidth={2} /> : <ChevronLeft size={size ?? 20} color={color} strokeWidth={2.2} />;
}
