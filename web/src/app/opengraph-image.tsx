// The picture shown when a farmkeke.com link is shared (WhatsApp, Facebook,
// X, LinkedIn): 1200×630, drawn once at build time. Pages with their own
// picture (products, farms) set it themselves.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Farmkeke: fresh produce from verified Nigerian farms, from the farm directly to your home";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FOREST = "#1e3b16";
const LIME = "#a9d654";
const LIME_SOFT = "#e4f2c7";
const CANVAS = "#f4f5ef";
const MUTED = "#4a5a43";

export default async function Image() {
  const [heading, body, wordmark] = await Promise.all([
    readFile(join(process.cwd(), "assets/og/Montserrat_800ExtraBold.ttf")),
    readFile(join(process.cwd(), "assets/og/Inter_500Medium.ttf")),
    readFile(join(process.cwd(), "public/brand/wordmark.png")),
  ]);
  const logo = `data:image/png;base64,${wordmark.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: CANVAS, padding: "64px 80px" }}>
        <img src={logo} width={282} height={54} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", alignSelf: "flex-start", background: LIME_SOFT, color: FOREST, fontFamily: "Inter", fontSize: 26, padding: "10px 22px", borderRadius: 999 }}>
            Fresh from verified Nigerian farms
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "Montserrat", fontSize: 84, lineHeight: 1.1, color: FOREST, letterSpacing: -2 }}>
            <span>From the farm directly</span>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span>to your&nbsp;</span>
              <span style={{ background: LIME, borderRadius: 18, padding: "0 18px" }}>home</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "Inter", fontSize: 28, color: MUTED }}>
          <span>Fresh produce at fair prices, delivered by Farmkeke riders</span>
          <span style={{ color: FOREST }}>farmkeke.com</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Montserrat", data: heading, weight: 800, style: "normal" },
        { name: "Inter", data: body, weight: 500, style: "normal" },
      ],
    },
  );
}
