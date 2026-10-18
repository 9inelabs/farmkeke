"use client";

// W-S3 Maintenance. Reads appConfig.get live: while maintenance is on it shows
// the design; when it ends, it offers a way back to where the visitor was.
import { useQuery } from "convex/react";
import { ArrowRight, CircleCheck, Mail, Wrench } from "lucide-react";
import { useSyncExternalStore } from "react";
import { HomeLogo } from "@/components/brand/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { MAINTENANCE_FROM_KEY } from "@/components/system/MaintenanceGate";
import { api } from "@/convex/api";
import type { AppConfig } from "@/convex/returns/system";
import { LAGOS_TZ } from "@/lib/format";
import { Reveal } from "@/lib/motion";
import { routes } from "@/lib/routes";

/** Epoch ms → "Sunday 18 Oct, 6:00am" in Nigerian time */
function backBy(ms: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LAGOS_TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")}, ${get("hour")}:${get("minute")}${get("dayPeriod").toLowerCase().replace(/\s|\./g, "")}`;
}

const noop = () => () => {};
/** Where the visitor was when maintenance started (only safe, same-site paths). */
function useReturnTo() {
  return useSyncExternalStore(
    noop,
    () => {
      try {
        const from = window.sessionStorage.getItem(MAINTENANCE_FROM_KEY);
        return from && from.startsWith("/") && !from.startsWith("//") && from !== routes.maintenance ? from : routes.shop;
      } catch {
        return routes.shop;
      }
    },
    () => routes.shop,
  );
}

export function MaintenanceView() {
  const config = useQuery(api.appConfig.get, {}) as AppConfig | null | undefined;
  const returnTo = useReturnTo();
  const ended = config !== undefined && config?.maintenanceActive !== true;

  return (
    <>
      <header className="wrap-site flex h-[88px] items-center">
        <HomeLogo height={22} />
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="wrap-site grid grid-cols-[minmax(0,6fr)_minmax(0,5fr)] items-center gap-14 pt-14 pb-16 outline-none m:grid-cols-[minmax(0,1fr)] m:gap-10 m:pt-6"
      >
        {ended ? (
          <Reveal className="flex flex-col items-start gap-[18px]" role="status">
            <span className="badge b-ok h-[30px] px-3 text-[13px]">
              <CircleCheck aria-hidden className="size-[15px]" />
              Maintenance finished
            </span>
            <h1 className="h1 text-[46px] leading-[54px]">Farmkeke is back</h1>
            <p className="text-lg leading-[29px] text-muted m:text-base m:leading-[26px]">
              Thanks for waiting. Everything is working again.
            </p>
            <ButtonLink href={returnTo} variant="lime" iconAfter={<ArrowRight aria-hidden className="size-[18px]" />} className="mt-1.5 min-h-12 px-[22px]">
              Continue where you left off
            </ButtonLink>
          </Reveal>
        ) : (
          <div className="flex flex-col items-start gap-[18px]">
            <span className="badge b-pend h-[30px] px-3 text-[13px]">
              <Wrench aria-hidden className="size-[15px]" />
              Scheduled maintenance
            </span>
            <h1 className="h1 text-[46px] leading-[54px]">We&apos;re making Farmkeke better</h1>
            <p className="text-lg leading-[29px] text-muted m:text-base m:leading-[26px]">
              {config?.maintenanceMessage ||
                "The website and app are briefly offline while we make some improvements. We'll be back shortly."}
            </p>
            <dl className="card mt-1.5 w-full max-w-[460px] rounded-[20px] px-5 py-1.5">
              {config === undefined || config?.maintenanceUntil ? (
                <Kv label="Back by">
                  {config?.maintenanceUntil ? (
                    <span className="font-bold">{backBy(config.maintenanceUntil)}</span>
                  ) : (
                    <Skeleton className="h-4 w-40" />
                  )}
                </Kv>
              ) : null}
              <Kv label="Your orders">
                <span className="font-semibold">Still being delivered</span>
              </Kv>
              <Kv label="Your money">
                <span className="font-semibold">Safely held as usual</span>
              </Kv>
            </dl>
            {/* mailto, not the Contact page: every page redirects here during maintenance. */}
            <a className="btn ghost mt-1.5 min-h-12 px-[22px] m:whitespace-normal" href="mailto:support@farmkeke.com">
              <Mail aria-hidden className="size-[18px] flex-none" />
              Email support@farmkeke.com
            </a>
          </div>
        )}

        <div
          aria-hidden
          className="relative flex h-[460px] items-center justify-center overflow-hidden rounded-[28px] bg-[#E9F2D8] m:h-[280px]"
        >
          <div className="absolute size-[380px] rounded-full bg-white/45" />
          <div className="absolute size-[250px] rounded-full bg-white/70" />
          <span className="relative flex size-[120px] items-center justify-center rounded-[36px] bg-forest text-lime">
            <Wrench className="size-14" strokeWidth={1.5} />
          </span>
        </div>
      </main>
    </>
  );
}

function Kv({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-sm [&+&]:shadow-[inset_0_1px_0_var(--color-line-soft)]">
      <dt className="text-muted-2">{label}</dt>
      <dd className="m-0 text-right">{children}</dd>
    </div>
  );
}
