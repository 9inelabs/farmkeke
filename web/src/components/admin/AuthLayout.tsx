// The Admin Portal's sign-in screens (redesign, Nov 2026): a soft morning-
// green sky with light arcs behind a frosted card, an icon tile above the
// title, compact fields with icons inside, and a forest button. Used by
// sign in, the emailed code, apply, forgot password, set password and the
// portal's "can't continue" states.
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";

export function AdminAuthCard({
  children,
  width = 440,
  icon,
  headerRight,
}: {
  children: ReactNode;
  width?: number;
  /** The icon in the tile above the title. */
  icon?: ReactNode;
  headerRight?: ReactNode;
}) {
  return (
    <div className="admin-auth relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#D9ECBF_0%,#E9F4DA_34%,#F5F9EE_70%,#FAFCF6_100%)]">
      {/* Soft light, like sun through morning haze */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.85),rgba(255,255,255,0))]" />
        <div className="absolute bottom-[-180px] left-[-120px] h-[420px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.9),rgba(255,255,255,0))]" />
        <div className="absolute right-[-140px] bottom-[-120px] h-[380px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.8),rgba(255,255,255,0))]" />
        <div className="absolute top-[18%] right-[8%] h-[260px] w-[260px] rounded-full bg-[radial-gradient(closest-side,rgba(169,214,84,0.28),rgba(169,214,84,0))]" />
        {/* Light arcs behind the card */}
        <svg className="absolute top-[54%] left-1/2 -translate-x-1/2 -translate-y-1/2" width="1400" height="1400" viewBox="0 0 1400 1400" fill="none">
          {[280, 400, 520, 640].map((r, i) => (
            <circle key={r} cx="700" cy="700" r={r} stroke="#FFFFFF" strokeOpacity={0.75 - i * 0.15} strokeWidth="1.2" />
          ))}
        </svg>
      </div>

      <header className="relative z-10 flex h-[72px] items-center justify-between gap-4 px-10 m:px-5">
        <span className="flex items-center gap-2.5">
          <Wordmark height={20} priority />
          <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] text-forest uppercase shadow-[inset_0_0_0_1px_rgba(30,59,22,0.12)]">
            Admin portal
          </span>
        </span>
        {headerRight}
      </header>

      <main id="main" tabIndex={-1} className="relative z-10 mx-auto px-5 pt-[min(9vh,88px)] pb-16 outline-none m:pt-6" style={{ maxWidth: width + 40 }}>
        <section className="rounded-[28px] bg-[linear-gradient(180deg,rgba(228,242,199,0.75)_0%,rgba(255,255,255,0.88)_32%,rgba(255,255,255,0.94)_100%)] px-9 pt-9 pb-8 shadow-[0_30px_80px_rgba(30,59,22,0.14),inset_0_0_0_1px_rgba(255,255,255,0.9)] backdrop-blur-xl m:px-5 m:pt-7 m:pb-6">
          {icon ? (
            <div className="mb-5 flex justify-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-forest shadow-[0_10px_24px_rgba(30,59,22,0.12),inset_0_0_0_1px_rgba(30,59,22,0.06)] [&_svg]:size-6">
                {icon}
              </span>
            </div>
          ) : null}
          {children}
        </section>
        <p className="mt-6 text-center text-xs text-muted-2">Farmkeke Admin Portal · For Farmkeke staff only</p>
      </main>
    </div>
  );
}

/** Centred title of the sign-in card. */
export const adminAuthTitle = "m-0 text-center font-display text-[22px] leading-7 font-bold tracking-[-0.02em] text-ink";
/** Centred line under the title. */
export const adminAuthLead = "mx-auto mt-2 max-w-[320px] text-center text-[13.5px] leading-5 text-muted";
