"use client";

// W-S6 Session expired: "Sign in" (back to ?next=) or keep shopping as a guest.
import { Lock, LogIn, Store } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { MinimalHeader } from "@/components/layout/SimpleHeaders";
import { ButtonLink } from "@/components/ui/Button";
import { useViewer } from "@/lib/auth";
import { initials } from "@/lib/format";
import { routes } from "@/lib/routes";

/** Only same-site paths are allowed as a return address. */
function safeNext(raw: string | null | undefined) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : undefined;
}

export function SessionExpiredView({ next }: { next?: string | null }) {
  if (next === null) return <View next={undefined} />;
  return <ViewWithParams />;
}

function ViewWithParams() {
  const params = useSearchParams();
  return <View next={safeNext(params.get("next"))} />;
}

function View({ next }: { next: string | undefined }) {
  // Usually signed out by now; if the account is still known, show who it was.
  const { viewer } = useViewer();
  const name = viewer && !viewer.isAnonymous ? viewer.name : undefined;
  const email = viewer && !viewer.isAnonymous ? viewer.email : undefined;

  return (
    <>
      <MinimalHeader />
      <main id="main" tabIndex={-1} className="flex justify-center px-4 pt-20 pb-16 outline-none m:pt-8">
        <section
          aria-labelledby="session-expired-title"
          className="w-[480px] max-w-full rounded-[24px] bg-surface px-8 pt-9 pb-7 text-center shadow-[0_30px_80px_rgba(0,0,0,0.25)] m:px-5"
        >
          <span className="tile mx-auto size-16 rounded-[20px]" aria-hidden>
            <Lock className="size-7" />
          </span>
          <h1 id="session-expired-title" className="mont mt-[18px] text-[23px] leading-[31px] font-bold">
            Please sign in again
          </h1>
          <p className="p mt-2">
            For your security, you were signed out after a long time away. Sign in to continue where you left off.
          </p>
          {name || email ? (
            <div className="mt-[18px] flex items-center gap-3 rounded-xl bg-[#F7F8F4] px-3.5 py-3 text-left">
              <span
                aria-hidden
                className="flex size-9 flex-none items-center justify-center rounded-full bg-lime-soft text-[13px] font-bold text-forest"
              >
                {initials(name || email || "")}
              </span>
              <div className="min-w-0 flex-1">
                {name ? <div className="text-sm font-semibold">{name}</div> : null}
                {email ? <div className="cap truncate">{email}</div> : null}
              </div>
            </div>
          ) : null}
          <div className="mt-[18px]">
            <ButtonLink href={routes.signIn(next)} variant="lime" fullWidth icon={<LogIn aria-hidden className="size-[18px]" />} className="min-h-12">
              Sign in
            </ButtonLink>
          </div>
          <div className="mt-2.5">
            <ButtonLink href={routes.shop} variant="ghost" fullWidth icon={<Store aria-hidden className="size-[18px]" />} className="min-h-12">
              Keep shopping as a guest
            </ButtonLink>
          </div>
          <p className="cap mt-3.5">Your cart is still saved.</p>
        </section>
      </main>
    </>
  );
}
