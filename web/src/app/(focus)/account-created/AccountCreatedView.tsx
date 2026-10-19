"use client";

// W-42 Account created. If the shopper ordered as a guest on this browser,
// the orders found before sign-up are listed with "Add them to my account"
// (orders.consumer.claimGuestOrders). Otherwise, guest orders placed elsewhere
// with this email are offered (GuestOrdersByEmail).
import { useMutation } from "convex/react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { afterSignup } from "@/components/account/afterSignup";
import { AuthCard } from "@/components/account/AuthLayouts";
import { GuestOrdersByEmail } from "@/components/account/GuestOrdersByEmail";
import { QuietBoundary } from "@/components/system/QuietBoundary";
import {
  claimPendingGuestOrders,
  claimSnapshot,
  forgetClaimSnapshot,
  pendingClaimToken,
  type ClaimSnapshot,
} from "@/components/account/claim";
import { useHydrated } from "@/components/cart/parts";
import { firstName } from "@/components/orders/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/convex/api";
import { stageOf, statusBadge } from "@/convex/returns/orders";
import { useViewer } from "@/lib/auth";
import { displayPhone, initials, naira, plural, tintFor } from "@/lib/format";
import { routes } from "@/lib/routes";

export function AccountCreatedView() {
  const hydrated = useHydrated();
  const { status, viewer } = useViewer();
  if (!hydrated || status === "loading")
    return (
      <AuthCard width={520} top={64} padding="40px 36px" center>
        <Skeleton className="mx-auto size-[72px]" rounded={999} />
        <Skeleton className="mx-auto mt-6 h-9 w-3/4" />
        <Skeleton className="mx-auto mt-3 h-5 w-full" />
      </AuthCard>
    );
  const after = afterSignup();
  const name = firstName(viewer?.name ?? after.name ?? undefined);
  return (
    <Welcome
      name={name}
      next={after.next}
      snapshot={pendingClaimToken() ? claimSnapshot() : null}
      claimable={!!pendingClaimToken() && status === "signed-in"}
    />
  );
}

function Welcome({
  name,
  next,
  snapshot,
  claimable,
}: {
  name: string | undefined;
  next: string | null;
  snapshot: ClaimSnapshot | null;
  claimable: boolean;
}) {
  const router = useRouter();
  const claim = useMutation(api.orders.consumer.claimGuestOrders);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = snapshot?.orders.length ?? 0;
  const who = [snapshot?.email, snapshot?.phone ? displayPhone(snapshot.phone) : null].filter(Boolean).join(" or ");

  const add = async () => {
    setBusy(true);
    setError(null);
    const moved = await claimPendingGuestOrders(claim);
    if (moved === null) {
      setBusy(false);
      setError("We couldn't add them. The link to your guest orders may have expired. Find them with Find my order.");
      return;
    }
    forgetClaimSnapshot();
    router.push(routes.myOrders);
  };

  return (
    <AuthCard width={520} top={64} padding="40px 36px" center>
      <span aria-hidden className="inline-flex size-[72px] items-center justify-center rounded-full bg-lime text-forest">
        <Check className="size-[34px]" strokeWidth={2.5} />
      </span>
      <h1 className="m-0 mt-[22px] font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em]">
        Welcome to Farmkeke{name ? `, ${name}` : ""}
      </h1>
      <p className="p mt-2">Your account is ready. You&apos;ll stay signed in on this browser.</p>

      {claimable ? (
        <div className="mt-[26px] rounded-2xl bg-[#F7FAF1] px-5 py-[18px] text-left shadow-[inset_0_0_0_1px_#DCE9C3]">
          <div className="text-[15px] font-bold">
            {count > 0 ? `We found ${plural(count, "earlier order")}` : "We found your earlier orders"}
          </div>
          <div className="mt-0.5 text-[13px] text-muted">
            {who ? `Placed as a guest with ${who}` : "Placed as a guest on this browser"}
          </div>
          {snapshot && count > 0 ? (
            <ul className="m-0 mt-2.5 list-none p-0">
              {snapshot.orders.slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-3 text-sm [&+&]:shadow-[inset_0_1px_0_#EEF0EB]">
                  <span
                    aria-hidden
                    className="flex size-9 flex-none items-center justify-center rounded-full text-xs font-bold text-forest"
                    style={{ background: tintFor(o.farmId) }}
                  >
                    {initials(o.farmName)}
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">
                      {o.number} · {o.farmName}
                    </span>
                    <span className="block text-xs text-subtle">
                      {naira(o.totalKobo)} · {statusBadge({ stage: stageOf(o.status), fulfilment: o.fulfilment }).label}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <Button variant="lime" fullWidth loading={busy} onClick={add} className="mt-3 min-h-11">
            Add them to my account
          </Button>
          {error ? (
            <p role="alert" className="field-error text-center">
              {error}
            </p>
          ) : null}
          <p className="mt-2.5 text-center text-xs leading-[17px] text-subtle">
            Once added, you can confirm delivery from any device you&apos;re signed in on.
          </p>
        </div>
      ) : (
        <QuietBoundary>
          <GuestOrdersByEmail className="mt-[26px]" />
        </QuietBoundary>
      )}

      <ButtonLink href={next ?? routes.shop} variant="ghost" fullWidth className="mt-3.5 min-h-11">
        {next ? "Continue" : "Continue shopping"}
      </ButtonLink>
    </AuthCard>
  );
}
