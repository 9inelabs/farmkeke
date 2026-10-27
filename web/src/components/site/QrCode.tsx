// QR code that opens the Get the app page (landing closing section, W-83).
// Generated on the server as an inline SVG, so it costs no extra request.
import { cacheLife } from "next/cache";
import QRCode from "qrcode";
import { routes } from "@/lib/routes";
import { SITE_URL } from "@/lib/siteUrl";

export const APP_LINK = `${SITE_URL}${routes.getTheApp}`;

async function qrSvg(text: string) {
  "use cache";
  cacheLife("max");
  return QRCode.toString(text, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1A1A1AFF", light: "#FFFFFFFF" },
  });
}

/** `size` is the outer box (the design's 132px or 112px frame with 12px padding). */
export async function QrCode({ size = 132 }: { size?: number }) {
  const svg = await qrSvg(APP_LINK);
  return (
    <div
      role="img"
      aria-label={`QR code to download the Farmkeke app. It opens ${APP_LINK.replace(/^https?:\/\//, "")}`}
      className="flex-none rounded-xl bg-surface p-3 shadow-[inset_0_0_0_1px_var(--color-field)] [&_svg]:block [&_svg]:size-full"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
