"use client";

// W-51b: the pickup code as a QR code for the counter to scan. Drawn in the
// browser (the code is private, so it's never rendered on the server).
import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function PickupQr({ code, size = 132 }: { code: string; size?: number }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toString(code, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1A1A1AFF", light: "#FFFFFFFF" } })
      .then((s) => live && setSvg(s))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [code]);
  return (
    <div
      role="img"
      aria-label={`QR code of your pickup code ${code.split("").join(" ")}`}
      className="flex-none rounded-2xl bg-white p-3.5 [&_svg]:block [&_svg]:size-full"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
