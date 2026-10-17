"use client";

// App Store / Google Play buttons (landing hero and closing section, W-83, shop
// app banner). PRD rules:
//  - On phone browsers only the matching store shows (Google Play on Android,
//    App Store on iPhone); computers see both.
//  - Until the apps are published the buttons read "Coming soon to …" and lead
//    to the Get the app page. Store links come from appConfig (set by staff).
import { useQuery } from "convex/react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { api } from "@/convex/api";
import type { AppConfig } from "@/convex/returns/common";
import { m, pressable } from "@/lib/motion";
import { routes } from "@/lib/routes";

type Platform = "android" | "iphone" | "other";

function detect(): Platform {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iphone";
  return "other";
}
const noop = () => () => {};
export function usePlatform(): Platform {
  // Server and first paint show both buttons; phones then narrow to theirs.
  return useSyncExternalStore(noop, detect, () => "other");
}

function AppleLogo() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-7" fill="currentColor">
      <path d="M16.37 12.6c-.02-2.27 1.86-3.37 1.94-3.42-1.06-1.55-2.71-1.76-3.29-1.78-1.4-.14-2.73.82-3.44.82-.71 0-1.8-.8-2.96-.78-1.52.02-2.93.89-3.71 2.25-1.59 2.75-.41 6.81 1.13 9.04.76 1.09 1.66 2.31 2.83 2.27 1.14-.05 1.57-.73 2.94-.73 1.37 0 1.76.73 2.96.71 1.22-.02 2-1.11 2.74-2.21.87-1.26 1.22-2.49 1.24-2.55-.03-.01-2.36-.91-2.38-3.6ZM14.13 5.9c.62-.76 1.05-1.8.93-2.85-.9.04-2 .6-2.64 1.36-.58.67-1.09 1.74-.95 2.77 1 .08 2.03-.51 2.66-1.28Z" />
    </svg>
  );
}

function PlayLogo() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-7">
      <path fill="#34A853" d="M3.6 2.3c-.2.2-.3.6-.3 1v17.4c0 .4.1.8.3 1l9.6-9.7-9.6-9.7Z" />
      <path fill="#FBBC04" d="m16.4 15.2-3.2-3.2 3.2-3.2 3.9 2.2c1.1.6 1.1 1.6 0 2.2l-3.9 2Z" />
      <path fill="#EA4335" d="M16.4 15.2 13.2 12l-9.6 9.7c.4.4.9.4 1.6.1l11.2-6.6Z" />
      <path fill="#4285F4" d="M16.4 8.8 5.2 2.2c-.7-.4-1.2-.3-1.6.1l9.6 9.7 3.2-3.2Z" />
    </svg>
  );
}

function StoreButton({ store, url }: { store: "apple" | "play"; url?: string }) {
  const live = Boolean(url);
  const small = live ? (store === "apple" ? "Download on the" : "Get it on") : "Coming soon to";
  const big = store === "apple" ? "App Store" : "Google Play";
  const cls =
    "inline-flex h-[58px] items-center gap-3 rounded-[14px] bg-ink pr-[22px] pl-[18px] text-left text-white hover:bg-black hover:text-white m:justify-center";
  const body = (
    <>
      {store === "apple" ? <AppleLogo /> : <PlayLogo />}
      <span>
        <span className="block text-[11px] leading-[14px] text-[#C8C8C8]">{small}</span>
        <span className="block font-display text-lg leading-[22px] font-bold">{big}</span>
      </span>
    </>
  );
  return (
    <m.span {...pressable} className="inline-flex m:flex">
      {live ? (
        <a href={url} className={`${cls} m:w-full`} rel="noopener">
          {body}
        </a>
      ) : (
        <Link href={routes.getTheApp} className={`${cls} m:w-full`}>
          {body}
        </Link>
      )}
    </m.span>
  );
}

export function StoreButtons({ className }: { className?: string }) {
  const platform = usePlatform();
  const config = useQuery(api.appConfig.get, {}) as AppConfig | undefined;
  return (
    <div className={`flex flex-wrap gap-3 m:flex-col m:items-stretch ${className ?? ""}`}>
      {platform !== "android" ? <StoreButton store="apple" url={config?.iosStoreUrl} /> : null}
      {platform !== "iphone" ? <StoreButton store="play" url={config?.androidStoreUrl} /> : null}
    </div>
  );
}
