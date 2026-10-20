// W-83 Get the app (also where "Coming soon" store buttons and the QR code lead).
import { ArrowRight, Clock, MapPin, MessageCircle, RefreshCw, Search, Smartphone, Sprout, Star, Store, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
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
  [Clock, "Instant order alerts", "Know the moment your order is accepted, packed and on the way."],
  [MessageCircle, "Chat with farmers", "Ask questions and share photos with the farm."],
  [MapPin, "Use your location", "Find farms that deliver near you in one tap."],
  [RefreshCw, "Reorder in seconds", "Buy your regular items again from your order history."],
  [Star, "Rate your order", "Leave a review right after you confirm it's arrived."],
  [Sprout, "Sell on Farmkeke", "Farmers apply, list produce and manage orders in the app."],
];

export default function GetTheAppPage() {
  return (
    <div className="wrap-site pt-7">
      <FadeUp>
        <div
          className={`${S.panel} grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-center gap-10 bg-[#E9F2D8] !p-16 max-[1000px]:grid-cols-1 m:!px-5 m:!py-7`}
        >
          <div className="flex flex-col items-start gap-5">
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
            <div
              aria-hidden
              className="h-[596px] w-[290px] flex-none rounded-[44px] bg-ink p-2.5 shadow-[0_30px_60px_rgba(30,59,22,0.18)] m:h-[540px] m:w-[262px]"
            >
              <div className="flex size-full flex-col overflow-hidden rounded-[35px] bg-[#F7F7F5]">
                <div className="px-[18px] pt-[38px]">
                  <div className="text-xs text-subtle">Good morning, Adaeze</div>
                  <div className="mt-0.5 font-display text-[19px] font-extrabold">What are you buying today?</div>
                  <div className="mt-3.5 flex h-10 items-center gap-2 rounded-full bg-surface px-3.5 text-xs text-[#9A9E95] shadow-[inset_0_0_0_1px_var(--color-field)]">
                    <Search size={14} strokeWidth={2} />
                    Search produce or farms
                  </div>
                  <div className="mt-3.5 rounded-2xl bg-forest p-3.5 text-white">
                    <div className="text-[11px] font-semibold text-lime">Your order is on the way</div>
                    <div className="mt-0.5 text-sm font-bold">FK-10234 · Okafor Farms</div>
                    <div className="mt-2.5 h-1.5 rounded-md bg-white/16">
                      <div className="h-full w-[72%] rounded-md bg-lime" />
                    </div>
                  </div>
                  <div className="mt-4 font-display text-sm font-bold">Fresh picks</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      ["Tomatoes", "₦4,500", "#F6E3DC"],
                      ["Farm eggs", "₦5,200", "#F4EEDD"],
                    ].map(([n, p, bg]) => (
                      <div key={n} className="rounded-xl bg-surface p-[7px] shadow-[inset_0_0_0_1px_#ECEEE8]">
                        <div className="h-[78px] rounded-lg" style={{ background: bg }} />
                        <div className="mt-1.5 text-[11px] font-semibold">{n}</div>
                        <div className="font-display text-xs font-extrabold text-forest">{p}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-auto flex h-[58px] items-center justify-around bg-surface text-[10px] font-semibold text-[#9A9E95] shadow-[inset_0_1px_0_#ECEEE8]">
                  <span className="text-forest">Home</span>
                  <span>Categories</span>
                  <span>Cart</span>
                  <span>Orders</span>
                  <span>Account</span>
                </div>
              </div>
            </div>
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
            className={`${S.card} m-0 grid list-none grid-cols-3 gap-x-7 gap-y-8 p-9 min-[761px]:max-[1000px]:grid-cols-2 m:grid-cols-1 m:px-5 m:py-7`}
          >
            {FEATURES.map(([Icon, title, body]) => (
              <li key={title} className="flex items-start gap-3.5">
                <Tile icon={Icon} size={42} iconSize={20} />
                <div>
                  <h3 className="m-0 text-[15px] font-semibold">{title}</h3>
                  <div className="mt-0.5 text-sm leading-6 text-muted">{body}</div>
                </div>
              </li>
            ))}
          </ul>
        </FadeUp>
      </section>

      <section className={S.sec}>
        <FadeUp className="grid grid-cols-2 gap-6 m:grid-cols-1">
          <div className={`${S.card} flex items-start gap-[18px] p-8 m:px-5`}>
            <Tile icon={Smartphone} />
            <div>
              <h2 className={S.h3}>Works on most phones</h2>
              <p className="m-0 mt-1.5 text-sm leading-6 text-muted">
                Android 8 or newer, and iPhone with iOS 15 or newer. The app is small and works on slower connections.
              </p>
            </div>
          </div>
          <div className={`${S.card} flex items-start gap-[18px] p-8 m:px-5`}>
            <Tile icon={Store} />
            <div>
              <h2 className={S.h3}>Prefer not to download?</h2>
              <p className="m-0 mt-1.5 text-sm leading-6 text-muted">
                You can shop, pay and track orders on the website in any browser.
              </p>
              <Link href={routes.shop} className="mt-2.5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold">
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
