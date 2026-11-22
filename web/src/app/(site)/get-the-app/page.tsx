// W-83 Get the app (also where "Coming soon" store buttons and the QR code lead).
import { ArrowRight, Clock, MapPin, MessageCircle, RefreshCw, Smartphone, Sprout, Star, Store, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { StoreButtons } from "@/components/brand/StoreButtons";
import { QrCode } from "@/components/site/QrCode";
import { Eyebrow, S, Tile, lead, leadSize } from "@/components/site/ui";
import { FadeUp } from "@/lib/motion";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Get the app",
  description:
    "Download Farmkeke free on Android and iPhone. Shop faster, get instant order updates and chat with farmers.",
};

const FEATURES: Array<[LucideIcon, string, string]> = [
  [Clock, "Instant order alerts", "Know the moment your order is accepted and on the way."],
  [MessageCircle, "Chat with farmers", "Ask questions and share photos with the farm."],
  [MapPin, "Use your location", "Find farms that deliver near you in one tap."],
  [RefreshCw, "Reorder in seconds", "Buy your regular items again from your order history."],
  [Star, "Rate your order", "Leave a review right after you confirm it's arrived."],
  [Sprout, "Sell on Farmkeke", "Farmers apply, list produce and manage orders in the app."],
];

export default function GetTheAppPage() {
  return (
    <div className="wrap-site pt-7 m:pt-4">
      <FadeUp>
        <div
          className={`${S.panel} grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-center gap-10 bg-[#E9F2D8] !p-16 max-[1000px]:grid-cols-1 m:gap-7 m:!px-[18px] m:!py-6`}
        >
          <div className="flex flex-col items-start gap-5 m:gap-3.5">
            <Eyebrow icon={Smartphone}>The Farmkeke app</Eyebrow>
            <h1 className={S.h1}>Fresh produce, a tap away</h1>
            <p className={`${leadSize} text-[#3F4A37]`}>
              Free on Android and iPhone. Shop faster, get instant order updates and chat with farmers.
            </p>
            <StoreButtons className="m:w-full" />
            <div className="mt-2.5 flex items-center gap-[18px] rounded-[20px] bg-surface py-4 pr-[18px] pl-4 shadow-[inset_0_0_0_1px_#DCE6CB] m:hidden">
              <QrCode size={112} />
              <div>
                <div className="text-[15px] font-semibold">On a computer?</div>
                <div className="mt-0.5 max-w-[220px] text-sm leading-6 text-muted">Scan with your phone camera to download.</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            {/* A screenshot of the app's Home on a phone (decorative) */}
            <Image
              src="/hero/app-home.png"
              alt=""
              width={720}
              height={1391}
              sizes="(max-width: 760px) 240px, 310px"
              className="h-auto w-[310px] flex-none drop-shadow-[0_30px_50px_rgba(30,59,22,0.22)] m:w-[240px]"
            />
          </div>
        </div>
      </FadeUp>

      <section className={S.sec}>
        <FadeUp>
          <div className={S.sechead}>
            <Eyebrow icon={Star}>Why use the app</Eyebrow>
            <h2 className={S.h2}>Made for everyday shopping</h2>
            <p className={lead}>Everything on the website, plus a few things that work best on your phone.</p>
          </div>
          <ul
            className={`${S.card} m-0 grid list-none grid-cols-3 gap-x-7 gap-y-8 p-9 min-[761px]:max-[1000px]:grid-cols-2 m:grid-cols-1 m:gap-y-4 m:p-4`}
          >
            {FEATURES.map(([Icon, title, body]) => (
              <li key={title} className="flex items-start gap-3.5 m:gap-3">
                <Tile icon={Icon} size={42} iconSize={20} />
                <div>
                  <h3 className="m-0 text-[15px] font-semibold m:text-sm m:leading-5">{title}</h3>
                  <div className="mt-0.5 text-sm leading-6 text-muted m:text-[13px] m:leading-5">{body}</div>
                </div>
              </li>
            ))}
          </ul>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="grid grid-cols-2 gap-6 m:grid-cols-1 m:gap-3">
          <div className={`${S.card} flex items-start gap-[18px] p-8 m:gap-3 m:p-4`}>
            <Tile icon={Smartphone} />
            <div>
              <h2 className={S.h3}>Works on most phones</h2>
              <p className="m-0 mt-1.5 text-sm leading-6 text-muted m:mt-1 m:text-[13px] m:leading-5">
                Android 8 or newer, and iPhone with iOS 15 or newer. The app is small and works on slower connections.
              </p>
            </div>
          </div>
          <div className={`${S.card} flex items-start gap-[18px] p-8 m:gap-3 m:p-4`}>
            <Tile icon={Store} />
            <div>
              <h2 className={S.h3}>Prefer not to download?</h2>
              <p className="m-0 mt-1.5 text-sm leading-6 text-muted m:mt-1 m:text-[13px] m:leading-5">
                You can shop, pay and track orders on the website in any browser.
              </p>
              <Link href={routes.shop} className="mt-2.5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold m:mt-0.5 m:min-h-10 m:text-[13px]">
                Shop on the web
                <ArrowRight aria-hidden size={16} strokeWidth={2} />
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>
    </div>
  );
}
