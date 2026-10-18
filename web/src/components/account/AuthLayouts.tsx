"use client";

// Layouts shared by the sign-in and password pages:
// - AuthSplit: W-40 / W-41, form on the left, forest panel on the right
//   (the panel is hidden on phones).
// - AuthCard: W-42 to W-42e, logo bar and a centred card.
// Plus the live password rules (W-41, W-42c) and the return-address helper.
import { Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { HomeLogo } from "@/components/brand/Wordmark";
import { Reveal } from "@/lib/motion";
import { routes } from "@/lib/routes";

/** Only same-site paths are allowed as a return address (?next=). */
export function safeNext(raw: string | null | undefined): string | undefined {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : undefined;
}

export function AuthSplit({ children, side }: { children: ReactNode; side: "signin" | "signup" }) {
  return (
    <div className="grid min-h-dvh grid-cols-2 bg-surface m:grid-cols-1">
      <div className="flex flex-col px-14 py-10 m:px-5 m:py-6">
        <HomeLogo height={22} />
        <main id="main" tabIndex={-1} className="m-auto w-full max-w-[420px] py-10 outline-none m:py-8">
          <Reveal>{children}</Reveal>
        </main>
      </div>
      <aside
        aria-hidden
        className="relative flex flex-col justify-between overflow-hidden bg-forest p-14 text-white m:hidden"
      >
        <div className="absolute -top-[120px] -right-[120px] size-[380px] rounded-full bg-[rgba(169,214,84,0.10)]" />
        {side === "signin" ? (
          <>
            <div className="relative max-w-[440px] font-display text-[38px] leading-[46px] font-extrabold tracking-[-0.02em]">
              From the farm directly to your home
            </div>
            <div className="relative flex max-w-[380px] flex-col gap-3">
              <div className="flex items-center gap-3 rounded-2xl bg-white/8 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
                <span className="size-12 flex-none rounded-xl bg-[#F6E3DC]" />
                <div className="flex-1">
                  <div className="text-sm font-semibold">Fresh tomatoes</div>
                  <div className="text-xs text-on-forest">Okafor Farms · Harvested today</div>
                </div>
                <span className="font-display font-extrabold text-lime">₦4,500</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/8 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
                <span className="flex size-9 flex-none items-center justify-center rounded-full bg-lime text-forest">
                  <ShieldCheck className="size-[18px]" strokeWidth={2} />
                </span>
                <div className="text-sm leading-5">Your money is held safely until you confirm delivery</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="relative max-w-[440px] font-display text-[38px] leading-[46px] font-extrabold tracking-[-0.02em]">
              Fresh food, fairer prices, every week
            </div>
            <div className="relative flex max-w-[380px] flex-col gap-3">
              {["Save delivery addresses", "Track orders on any device", "Keep a list of saved produce"].map((t, i) => (
                <div
                  key={t}
                  className="flex items-center gap-3 rounded-2xl bg-white/8 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
                >
                  <span className="flex size-9 flex-none items-center justify-center rounded-full bg-lime text-sm font-bold text-forest">
                    {i + 1}
                  </span>
                  <div className="text-sm">{t}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="relative text-[13px] text-on-forest">Verified farmers · Protected payments · Delivery or pickup</div>
      </aside>
    </div>
  );
}

/** W-42 to W-42e: logo bar and a centred card. */
export function AuthCard({
  children,
  width = 480,
  top = 72,
  before,
  after,
  center = false,
  padding = "36px",
}: {
  children: ReactNode;
  width?: number;
  /** Space above the card in px (designs: 64, 72 or 88) */
  top?: number;
  /** e.g. a "Back to sign in" link above the card */
  before?: ReactNode;
  /** e.g. a link under the card */
  after?: ReactNode;
  center?: boolean;
  padding?: string;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex h-[72px] items-center bg-surface px-10 shadow-[inset_0_-1px_0_var(--color-line)] m:px-4">
        <HomeLogo height={22} />
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto px-5 pb-16 outline-none m:pt-8"
        style={{ maxWidth: width, paddingTop: top }}
      >
        {before}
        <Reveal>
          <section
            className={`rounded-[24px] bg-surface shadow-[inset_0_0_0_1px_var(--color-line)] m:px-5! m:py-8! ${center ? "text-center" : ""}`}
            style={{ padding }}
          >
            {children}
          </section>
        </Reveal>
        {after}
      </main>
    </div>
  );
}

export const authTitle = "m-0 font-display text-[26px] leading-[34px] font-extrabold tracking-[-0.02em]";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m15 18-6-6 6-6" />
      </svg>
      {children}
    </Link>
  );
}

export function passwordChecks(password: string) {
  return [
    { label: "8 or more characters", ok: password.length >= 8 },
    { label: "A letter", ok: /[a-zA-Z]/.test(password) },
    { label: "A number", ok: /\d/.test(password) },
  ];
}
export const strongPassword = (p: string) => passwordChecks(p).every((c) => c.ok);

/** The three rules under a new password, ticking green as they're met. */
export function PasswordRules({ password, id }: { password: string; id: string }) {
  return (
    <span id={id} className="mt-2.5 flex flex-wrap gap-3.5">
      {passwordChecks(password).map((c) => (
        <span key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? "text-ok" : "text-subtle"}`}>
          {c.ok ? (
            <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
          ) : (
            <span aria-hidden className="size-3.5 rounded-full shadow-[inset_0_0_0_1.5px_#B9BEB1]" />
          )}
          {c.label}
          <span className="sr-only">{c.ok ? " (done)" : " (needed)"}</span>
        </span>
      ))}
    </span>
  );
}

export const supportLink = routes.contact;
