"use client";

// W-S2 Something went wrong. Used by app/error.tsx (inside the root layout)
// and app/global-error.tsx (which replaces it, so this uses plain elements
// rather than the motion-based Button). The reference is error.digest when
// the server sent one, so support can find it in the logs.
import { CircleHelp, RotateCw, ShieldCheck, Store, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { routes } from "@/lib/routes";

function reference(error: unknown, fallback: string) {
  const digest = error && typeof error === "object" && "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";
  const raw = digest.replace(/[^a-zA-Z0-9]/g, "") || fallback;
  return `ERR-${raw.slice(0, 4).toUpperCase()}`;
}

export function ErrorView({ error, retry }: { error: unknown; retry: () => void }) {
  // A short code from the time the error happened, when there's no digest.
  const [fallback] = useState(() => Date.now().toString(36).slice(-4));
  const ref = reference(error, fallback);
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="wrap-site flex h-[88px] items-center justify-between">
        <a href={routes.home} aria-label="Farmkeke home" className="flex flex-none items-center">
          <Wordmark height={24} priority />
        </a>
        <a href={routes.help} className="btn sm ghost">
          <CircleHelp aria-hidden className="size-4" strokeWidth={1.75} />
          Help
        </a>
      </header>
      <main id="main" tabIndex={-1} className="wrap-site flex flex-col items-center pt-[72px] pb-16 text-center outline-none m:pt-10">
        <span aria-hidden className="tile mt-2 size-16 rounded-[20px]">
          <TriangleAlert className="size-[30px]" strokeWidth={1.75} />
        </span>
        <h1 className="m-0 mt-6 max-w-[640px] font-display text-[40px] leading-[48px] font-extrabold tracking-[-0.03em] m:text-[30px] m:leading-[38px]">
          Something went wrong on our side
        </h1>
        <p className="mt-3 max-w-[540px] text-lg leading-[29px] text-muted m:text-base m:leading-[26px]">
          Sorry about that. It&apos;s not something you did. Please try again in a moment.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => retry()} className="btn lime min-h-12 px-[22px]">
            <RotateCw aria-hidden className="size-[18px]" strokeWidth={1.75} />
            Try again
          </button>
          <a href={routes.shop} className="btn ghost min-h-12 px-[22px]">
            <Store aria-hidden className="size-[18px]" strokeWidth={1.75} />
            Back to the shop
          </a>
        </div>
        <div className="card mt-10 flex w-[560px] max-w-full items-center gap-3.5 px-[22px] py-[18px] text-left">
          <span aria-hidden className="tile size-10">
            <ShieldCheck className="size-5" strokeWidth={1.75} />
          </span>
          <p className="p flex-1 text-sm">
            If you were paying, check{" "}
            <a href={routes.myOrders} className="font-semibold">
              My orders
            </a>{" "}
            before trying again so you aren&apos;t charged twice.
          </p>
        </div>
        <div className="cap mt-4">
          Error reference: {ref} ·{" "}
          <a href={routes.contact} className="font-semibold">
            Contact support
          </a>
        </div>
      </main>
    </div>
  );
}
