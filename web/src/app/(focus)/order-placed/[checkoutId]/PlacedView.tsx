"use client";

// W-30 Order confirmation. Clears the cart once the checkout is paid and, for
// guests, offers "Save your details as an account": the guest's orders are
// moved into the new account (startGuestClaim → sign up → claimGuestOrders).
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Check, Info, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { claimPendingGuestOrders, forgetClaimToken, saveClaimToken } from "@/components/account/claim";
import { draft } from "@/components/checkout/draft";
import { looksLikeEmail } from "@/components/checkout/draft";
import { MinimalHeader, NARROW_WRAP } from "@/components/layout/SimpleHeaders";
import { firstName, windowLabel, isoDayLabel } from "@/components/orders/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/convex/api";
import type { PlacedSummary } from "@/convex/returns/checkout";
import { stageOf, statusBadge } from "@/convex/returns/orders";
import { errorCode, useViewer } from "@/lib/auth";
import { cart } from "@/lib/cart";
import { displayPhone, initials, naira, plural, tintFor } from "@/lib/format";
import { Reveal } from "@/lib/motion";
import { routes } from "@/lib/routes";

const wrap = NARROW_WRAP;
const card = "rounded-[20px] bg-surface shadow-[inset_0_0_0_1px_var(--color-line)]";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <MinimalHeader
        wrapClassName={NARROW_WRAP}
        right={
          <Link href={routes.shop} className="inline-flex min-h-11 items-center text-sm font-semibold">
            Continue shopping
          </Link>
        }
      />
      <main id="main" tabIndex={-1} className={`${wrap} pt-10 pb-24 outline-none m:pt-7`}>
        {children}
      </main>
    </div>
  );
}

export function PlacedSkeleton() {
  return (
    <Shell>
      <LoadingRegion label="Loading your order">
        <div className="flex items-center gap-5">
          <Skeleton className="size-[72px] flex-none" rounded={999} />
          <div className="flex-1">
            <Skeleton className="h-10 w-[420px] max-w-full" />
            <Skeleton className="mt-2 h-5 w-[520px] max-w-full" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-7 m:grid-cols-1">
          <Skeleton className="h-[300px] w-full" rounded={20} />
          <Skeleton className="h-[360px] w-full" rounded={20} />
        </div>
      </LoadingRegion>
    </Shell>
  );
}

export function PlacedView({ checkoutId }: { checkoutId: string }) {
  const router = useRouter();
  const { isLoading: authLoading } = useConvexAuth();
  const live = useQuery(api.orders.consumer.placedSummary, authLoading ? "skip" : { checkoutId }) as
    | PlacedSummary
    | null
    | undefined;
  // Keep showing the order while the guest becomes an account (the query is
  // briefly empty between sign-up and the orders moving over).
  const [kept, setKept] = useState<PlacedSummary | null>(null);
  if (live && live !== kept) setKept(live);
  const summary = live ?? kept;

  const status = summary?.status;
  useEffect(() => {
    if (status === "awaiting_payment") router.replace(routes.pay(checkoutId));
    if (status === "paid") {
      cart.clear();
      const d = draft.get();
      if (d.checkoutId === checkoutId) draft.finish(d.placed);
    }
  }, [status, router, checkoutId]);

  if (summary === undefined || (live === undefined && !kept) || status === "awaiting_payment") return <PlacedSkeleton />;
  if (summary === null) return <NotFound />;
  return <Placed summary={summary} />;
}

function NotFound() {
  return (
    <Shell>
      <section className={`${card} mx-auto flex max-w-[560px] flex-col items-center gap-3 px-8 py-12 text-center m:px-5`}>
        <h1 className="m-0 font-display text-[26px] leading-[34px] font-extrabold">We couldn&apos;t find this order</h1>
        <p className="p">
          It may have been placed on another device or account. Find it with your order number and phone number.
        </p>
        <ButtonLink href={routes.findOrder} variant="lime" className="mt-2">
          Find my order
        </ButtonLink>
      </section>
    </Shell>
  );
}

function Placed({ summary }: { summary: PlacedSummary }) {
  const { status: viewerStatus } = useViewer();
  const placed = draft.use().placed;
  const mine = placed?.checkoutId === summary.checkoutId ? placed : null;
  const name = firstName(summary.contact.name);
  const orders = summary.orders;
  const delivery = summary.fulfilment === "delivery";
  const win = orders.find((o) => o.window)?.window ?? null;
  const street = summary.address?.street ?? mine?.street;
  const pointName = summary.pickupPoint?.name ?? mine?.pointName;
  const guest = summary.isGuest && viewerStatus !== "signed-in";
  const trackHref =
    orders.length === 1 ? routes.order(orders[0]!._id) : viewerStatus === "signed-in" ? routes.myOrders : routes.order(orders[0]!._id);

  const steps = [
    {
      title: orders.length > 1 ? "The farms accept and pack your orders" : "The farm accepts and packs your order",
      detail: "Usually within a few hours",
    },
    delivery
      ? {
          title: street ? `A Farmkeke rider delivers to ${street}` : "A Farmkeke rider delivers to your address",
          detail: win ? `${isoDayLabel(win.day)}, ${windowLabel(win.from, win.to)}` : "",
        }
      : {
          title: pointName ? `Your ${orders.length > 1 ? "orders go" : "order goes"} to ${pointName}` : "Your order goes to your pickup point",
          detail: "We'll text your pickup code when it's ready to collect",
        },
    {
      title: delivery ? "You check everything and confirm receipt" : "You collect, check everything and confirm receipt",
      detail: `Then ${orders.length > 1 ? "each farm is" : "the farm is"} paid. Something wrong? Report it before confirming.`,
    },
  ];

  return (
    <Shell>
      <Reveal>
        <section className="flex flex-wrap items-center gap-5">
          <span aria-hidden className="flex size-[72px] flex-none items-center justify-center rounded-full bg-lime text-forest">
            <Check className="size-9" strokeWidth={2.5} />
          </span>
          <div className="min-w-[280px] flex-1 m:min-w-0">
            <h1 className="m-0 font-display text-[32px] leading-10 font-extrabold tracking-[-0.025em] m:text-[26px] m:leading-[34px]">
              Order placed. Thank you{name ? `, ${name}` : ""}
            </h1>
            <p className="p mt-1">
              We&apos;ve sent your {orders.length > 1 ? "orders to the farms" : "order to the farm"}. We&apos;ll text{" "}
              {displayPhone(summary.contact.phone)} at every step.
            </p>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-7 m:grid-cols-1">
          <div className="flex flex-col gap-5">
            <section aria-labelledby="your-orders" className={`${card} overflow-hidden`}>
              <div className="flex items-center justify-between gap-3 px-6 py-5 shadow-[inset_0_-1px_0_#EEF0EB] m:px-4">
                <h2 id="your-orders" className="h3 text-lg leading-[26px]">
                  Your orders
                </h2>
                <span className="badge b-held">
                  <ShieldCheck aria-hidden className="size-[13px]" strokeWidth={2} />
                  {naira(summary.totalKobo)} held safely
                </span>
              </div>
              <ul className="m-0 list-none p-0">
                {orders.map((o) => {
                  const badge = statusBadge({ stage: stageOf(o.status), fulfilment: o.fulfilment });
                  return (
                    <li key={o._id} className="flex items-center gap-3.5 px-6 py-[18px] [&+&]:shadow-[inset_0_1px_0_#EEF0EB] m:flex-wrap m:px-4">
                      <span
                        aria-hidden
                        className="flex size-11 flex-none items-center justify-center rounded-full font-display text-sm font-bold text-forest"
                        style={{ background: tintFor(o.farmId) }}
                      >
                        {initials(o.farmName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold">
                          {o.number} · {o.farmName}
                        </div>
                        <div className="sm">
                          {plural(o.itemCount, "item")} · {naira(o.totalKobo)}
                          {o.fulfilment === "delivery" ? " with delivery" : ""}
                        </div>
                      </div>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="sm flex gap-2.5 bg-[#FAFBF8] px-6 py-4 shadow-[inset_0_1px_0_#EEF0EB] m:px-4">
                <Info aria-hidden className="size-[18px] flex-none text-forest" strokeWidth={1.75} />
                {orders.length > 1
                  ? "Farms have up to 24 hours to accept. If one doesn't, that order is refunded in full."
                  : "The farm has up to 24 hours to accept. If it doesn't, your order is refunded in full."}
              </div>
            </section>

            <section aria-labelledby="next-title" className={`${card} p-6 m:px-4`}>
              <h2 id="next-title" className="h3 text-lg leading-[26px]">
                What happens next
              </h2>
              <ol className="m-0 mt-[18px] list-none p-0">
                {steps.map((s, i) => (
                  <li key={s.title} className="relative flex items-start gap-3.5 pb-[18px]">
                    {i < steps.length - 1 ? (
                      <span aria-hidden className="absolute top-[26px] bottom-0 left-3 w-0.5 bg-line" />
                    ) : null}
                    <span
                      aria-hidden
                      className={`relative z-[1] flex size-[26px] flex-none items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? "bg-lime text-ink" : "bg-[#ECEEE8] text-muted-2"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{s.title}</div>
                      {s.detail ? <div className="cap mt-0.5">{s.detail}</div> : null}
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-2 flex flex-wrap gap-2.5">
                <ButtonLink href={trackHref} variant="lime" className="min-h-[52px] rounded-[14px] px-[22px]">
                  Track your {orders.length > 1 ? "orders" : "order"}
                </ButtonLink>
                <ButtonLink href={routes.shop} variant="ghost" className="min-h-[52px] rounded-[14px] px-[22px]">
                  Continue shopping
                </ButtonLink>
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-5">
            {guest ? <SaveAccount summary={summary} /> : null}
            <section className={`${card} flex items-center gap-3.5 px-6 py-5 m:px-4`}>
              <span aria-hidden className="flex size-11 flex-none items-center justify-center rounded-xl bg-tint text-forest">
                <Smartphone className="size-[22px]" strokeWidth={1.75} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold">Get live updates in the app</div>
                <div className="cap mt-0.5">Push alerts and chat with your farmer</div>
              </div>
              <Link href={routes.getTheApp} className="inline-flex min-h-11 items-center text-[13px] font-semibold">
                Get the app
              </Link>
            </section>
          </aside>
        </div>
      </Reveal>
    </Shell>
  );
}

type SaveErrors = Partial<Record<"email" | "password" | "form", React.ReactNode>>;

function SaveAccount({ summary }: { summary: PlacedSummary }) {
  const { signIn } = useAuthActions();
  const startClaim = useMutation(api.orders.consumer.startGuestClaim);
  const claim = useMutation(api.orders.consumer.claimGuestOrders);
  const [email, setEmail] = useState(summary.contact.email ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<SaveErrors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const count = summary.orders.length;
  const back = routes.orderPlaced(summary.checkoutId);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: SaveErrors = {};
    if (!looksLikeEmail(email)) next.email = "Enter your email address, e.g. name@example.com.";
    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password))
      next.password = "Use at least 8 characters, with letters and at least one number.";
    setErrors(next);
    if (next.email || next.password) return;
    setBusy(true);
    try {
      const { token } = (await startClaim({})) as { token: string };
      saveClaimToken(token);
      await signIn("password", { flow: "signUp", email: email.trim(), password, name: summary.contact.name });
      const moved = await claimPendingGuestOrders(claim);
      setDone(moved ?? count);
    } catch (err) {
      const code = errorCode(err);
      if (code === "EMAIL_TAKEN") {
        // Keep the claim token: signing in on W-40 moves the orders over.
        setErrors({
          email: (
            <>
              There&apos;s already an account with this email.{" "}
              <Link href={routes.signIn(back)} className="font-semibold text-err underline">
                Sign in instead
              </Link>{" "}
              and we&apos;ll add your {plural(count, "order")} to it.
            </>
          ),
        });
      } else {
        forgetClaimToken();
        setErrors(
          code === "INVALID_EMAIL"
            ? { email: "Check the email address, e.g. name@example.com." }
            : code === "WEAK_PASSWORD"
              ? { password: "Use at least 8 characters, with letters and at least one number." }
              : { form: "We couldn't create your account. Check your connection and try again." },
        );
      }
    } finally {
      setBusy(false);
    }
  };

  if (done !== null) {
    return (
      <section role="status" className={`${card} p-6 m:px-4`}>
        <span className="badge b-ok">
          <Check aria-hidden className="size-[13px]" strokeWidth={2.5} />
          Account created
        </span>
        <h2 className="h3 mt-3 text-lg leading-[26px]">Your details are saved</h2>
        <p className="sm mt-1.5">
          {done > 0
            ? `Your ${plural(done, "order")} ${done === 1 ? "is" : "are"} now in your account. Track ${done === 1 ? "it" : "them"} from any device.`
            : "You're signed in. Track your orders from any device."}
        </p>
        <ButtonLink href={routes.myOrders} variant="dark" fullWidth className="mt-[18px] min-h-[50px]">
          Go to my orders
        </ButtonLink>
      </section>
    );
  }

  return (
    <section aria-labelledby="save-title" className={`${card} p-6 m:px-4`}>
      <span className="badge b-fresh">Recommended</span>
      <h2 id="save-title" className="h3 mt-3 text-lg leading-[26px]">
        Save your details as an account
      </h2>
      <p className="sm mt-1.5">
        Track {count > 1 ? "these orders" : "this order"} from any device, check out faster and keep your addresses. Your{" "}
        {plural(count, "order")} will be added to your account.
      </p>
      <form noValidate onSubmit={submit} className="mt-[18px] flex flex-col gap-3.5">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          className="[&_input]:h-[50px]"
        />
        <PasswordField
          label="Create a password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          className="[&_input]:h-[50px]"
        />
        <Button type="submit" variant="dark" fullWidth loading={busy} className="min-h-[52px] rounded-[14px]">
          Create account
        </Button>
        {errors.form ? (
          <p role="alert" className="field-error mt-0">
            {errors.form}
          </p>
        ) : null}
      </form>
      <p className="cap mt-3.5">
        Without an account, only this device can confirm delivery. You can still look up your orders with{" "}
        <Link href={routes.findOrder} className="font-semibold">
          Find my order
        </Link>
        .
      </p>
    </section>
  );
}
