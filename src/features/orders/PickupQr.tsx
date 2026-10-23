// The pickup code as a QR code for the farmer to scan (M-64). Drawn on the
// phone from the code itself; nothing is fetched.
import QRCode from "qrcode/lib/core/qrcode";
import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "@/theme/tokens";

export function PickupQr({ code, size = 160 }: { code: string; size?: number }) {
  const path = useMemo(() => {
    const { modules } = QRCode.create(code, { errorCorrectionLevel: "M" });
    const n = modules.size;
    let d = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`;
    return { d, n };
  }, [code]);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`QR code of your pickup code ${code.split("").join(" ")}`}>
      <Svg width={size} height={size} viewBox={`0 0 ${path.n} ${path.n}`}>
        <Path d={path.d} fill={colors.ink} />
      </Svg>
    </View>
  );
}
