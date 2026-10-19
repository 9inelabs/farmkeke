import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import { AreaPicker } from "@/components/area/AreaPicker";
import { SessionKeeper } from "@/components/account/SessionKeeper";
import { MiniCart } from "@/components/cart/MiniCart";
import { Providers } from "@/components/providers/Providers";
import { ConnectionStatus } from "@/components/system/ConnectionStatus";
import { CookieBanner } from "@/components/system/CookieBanner";
import { MaintenanceGate } from "@/components/system/MaintenanceGate";
import { SiteOnly } from "@/components/system/SiteOnly";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://farmkeke.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Farmkeke · From the farm directly to your home",
    template: "%s · Farmkeke",
  },
  description:
    "Buy fresh produce straight from verified Nigerian farmers. Delivery or pickup, and your money is held safely until your order arrives.",
  applicationName: "Farmkeke",
  openGraph: {
    type: "website",
    siteName: "Farmkeke",
    locale: "en_NG",
    images: [{ url: "/brand/wordmark.png", width: 705, height: 135, alt: "Farmkeke" }],
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: "#1E3B16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG" className={`${inter.variable} ${montserrat.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only-focusable fixed top-3 left-3 z-[100] rounded-xl bg-forest px-4 py-3 font-semibold text-white"
        >
          Skip to main content
        </a>
        <Providers>
          {children}
          <SiteOnly>
            <MiniCart />
            <AreaPicker />
            <CookieBanner />
            <MaintenanceGate />
          </SiteOnly>
          <ConnectionStatus />
          <SessionKeeper />
        </Providers>
      </body>
    </html>
  );
}
