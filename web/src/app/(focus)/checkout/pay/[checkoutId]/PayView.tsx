"use client";

// W-26 Payment, W-27 Payment in progress, W-28 Payment failed, W-29 Awaiting
// payment confirmation.
// - Live: payments/checkout.start opens a Paystack transaction; its own popup
//   (inline.js v2, resumeTransaction) takes the card, transfer or USSD details.
//   If the popup can't load we go to Paystack's page, which sends the shopper
//   back here with ?reference=.
// - Test: "Pay now (test)" calls payments/checkout.markPaidTest.
// The checkout query is live, so a webhook marking it paid moves the page on by
// itself; `verify` asks Paystack directly while we wait.
// With `payToken` this is a delivery bill's pay link (/pay/…): it works on
// any device, for whoever has the link, and shows the bill first.
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { Building2, Clock, CreditCard, Lock, RotateCw, ShieldCheck, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { draft } from "@/components/checkout/draft";
import { HomeLogo, Wordmark } from "@/components/brand/Wordmark";
import { hm } from "@/components/orders/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { api, type Id } from "@/convex/api";
import type { CheckoutForPay, PaymentStart } from "@/convex/returns/checkout";
import type { PaymentsConfig } from "@/convex/returns/common";
import { errorCode, useEnsureIdentity } from "@/lib/auth";
import { dateTime, naira } from "@/lib/format";
import { Reveal } from "@/lib/motion";
import { routes } from "@/lib/routes";

type Method = "card" | "bank_transfer" | "ussd";
type Phase = "auto" | "choose" | "confirming" | "awaiting";

type PaystackCallbacks = {
  onSuccess?: (tx: unknown) => void;
  onCancel?: () => void;
  onError?: (e: unknown) => void;
};
type PaystackPopup = { resumeTransaction: (accessCode: string, callbacks?: PaystackCallbacks) => unknown };
declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopup;
  }
}

const PAYSTACK_JS = "https://js.paystack.co/v2/inline.js";
let paystackLoading: Promise<void> | null = null;
function loadPaystack(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  paystackLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = PAYSTACK_JS;
    s.async = true;
    s.onload = () => (window.PaystackPop ? resolve() : reject(new Error("PaystackPop missing")));
    s.onerror = () => {
      paystackLoading = null;
      reject(new Error("Paystack script failed"));
    };
    document.head.appendChild(s);
  });
  return paystackLoading;
}

const METHODS: Array<{ id: Method; label: string; icon: ReactNode }> = [
  { id: "card", label: "Card", icon: <CreditCard aria-hidden className="size-[18px]" strokeWidth={1.75} /> },
  { id: "bank_transfer", label: "Bank transfer", icon: <Building2 aria-hidden className="size-[18px]" strokeWidth={1.75} /> },
  { id: "ussd", label: "USSD", icon: <Smartphone aria-hidden className="size-[18px]" strokeWidth={1.75} /> },
];

const PANEL: Record<Method, { title: string; body: string }> = {
  card: {
    title: "Enter your card details",
    body: "Paystack opens a secure window for your card number, expiry date and CVV.",
  },
  bank_transfer: {
    title: "Pay by bank transfer",
    body: "Paystack shows an account number to send the money to. It's confirmed automatically, usually within minutes.",
  },
  ussd: {
    title: "Pay with USSD",
    body: "Paystack shows a code to dial from the phone number linked to your bank account.",
  },
};

export function PayView({ checkoutId: fromPath, payToken }: { checkoutId?: string; payToken?: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const returned = !!(search.get("reference") || search.get("trxref"));
  // Wait for the saved session (guest or account) before asking: the checkout
  // is only shown to the identity that placed it (or to a pay-link holder).
  const { isLoading: authLoading } = useConvexAuth();
  const owned = useQuery(api.payments.checkout.get, authLoading || payToken || !fromPath ? "skip" : { checkoutId: fromPath }) as
    | CheckoutForPay
    | null
    | undefined;
  const billed = useQuery(api.payments.checkout.bill, authLoading || !payToken ? "skip" : { token: payToken }) as
    | CheckoutForPay
    | null
    | undefined;
  const checkout = payToken ? billed : owned;
  const checkoutId = checkout?._id ?? fromPath ?? "";
  const isBill = !!payToken;
  const ensureIdentity = useEnsureIdentity();
  const configQ = useQuery(api.payments.config.get, {}) as PaymentsConfig | undefined;
  const config = checkout?.payments ?? configQ;
  const start = useAction(api.payments.checkout.start);
  const verify = useAction(api.payments.checkout.verify);
  const markPaidTest = useMutation(api.payments.checkout.markPaidTest);

  const [phase, setPhase] = useState<Phase>(returned ? "confirming" : "auto");
  const [method, setMethod] = useState<Method>("card");
  const [opening, setOpening] = useState(false);
  const [testing, setTesting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = checkoutId as Id<"checkouts">;

  const paid = checkout?.status === "paid";
  // Someone else's bill: stay here and say thank you (their orders aren't ours to show)
  const paidElsewhere = paid && isBill && checkout?.isOwner === false;
  // Paid: the owner sees their orders; delivery bills go to the order page
  const afterPaid = useCallback(() => {
    if (!isBill || checkout?.isOwner === false) return null;
    return checkout?.orders[0] ? routes.order(checkout.orders[0]._id) : routes.myOrders;
  }, [isBill, checkout]);
  useEffect(() => {
    if (!paid || paidElsewhere) return;
    router.replace(afterPaid() ?? routes.orderPlaced(checkoutId));
  }, [paid, paidElsewhere, router, checkoutId, afterPaid]);

  const check = useCallback(async () => {
    try {
      await verify({ checkoutId: id, payToken });
    } catch {
      // Offline or Paystack slow: the live query still updates on its own.
    }
  }, [verify, id, payToken]);

  // W-27: ask Paystack every few seconds; after 30s show W-29 instead.
  useEffect(() => {
    if (phase !== "confirming" || !checkout || checkout.status !== "awaiting_payment") return;
    void check();
    const every = setInterval(() => void check(), 4000);
    const giveUp = setTimeout(() => setPhase("awaiting"), 30_000);
    return () => {
      clearInterval(every);
      clearTimeout(giveUp);
    };
  }, [phase, checkout?.status, check]); // eslint-disable-line react-hooks/exhaustive-deps

  // W-29: keep checking quietly.
  const last = checkout?.lastAttempt ?? null;
  const pendingTransfer =
    (last?.status === "opened" || last?.status === "started") && (last.method === "bank_transfer" || last.method === "ussd");
  const view: "choose" | "confirming" | "awaiting" | "failed" =
    phase === "choose"
      ? "choose"
      : last?.status === "failed" && (phase === "auto" || phase === "confirming" || phase === "awaiting")
        ? "failed"
        : phase === "confirming"
          ? "confirming"
          : phase === "awaiting" || (phase === "auto" && pendingTransfer)
            ? "awaiting"
            : "choose";
  useEffect(() => {
    if (view !== "awaiting" || checkout?.status !== "awaiting_payment") return;
    const every = setInterval(() => void check(), 15_000);
    return () => clearInterval(every);
  }, [view, checkout?.status, check]);

  const expired = checkout && checkout.status !== "awaiting_payment" && checkout.status !== "paid";
  useEffect(() => {
    if (expired && draft.get().checkoutId === checkoutId) draft.patch({ checkoutId: null });
  }, [expired, checkoutId]);

  const begin = async (m: Method) => {
    if (opening) return;
    setOpening(true);
    setError(null);
    setMethod(m);
    try {
      // Paying from a link on another phone: a guest session to pay with
      if (isBill) await ensureIdentity();
      const r = (await start({ checkoutId: id, method: m, returnTo: "web", payToken })) as PaymentStart;
      try {
        await loadPaystack();
        new window.PaystackPop!().resumeTransaction(r.accessCode, {
          onSuccess: () => setPhase("confirming"),
          // Someone paying by transfer may have sent the money already.
          onCancel: () => setPhase(m === "card" ? "choose" : "awaiting"),
          onError: () => window.location.assign(r.authorizationUrl),
        });
        setPhase("choose");
        setOpening(false);
      } catch {
        window.location.assign(r.authorizationUrl);
      }
    } catch (e) {
      setOpening(false);
      const code = errorCode(e);
      if (code === "ALREADY_PAID") return router.replace(afterPaid() ?? routes.orderPlaced(checkoutId));
      setPhase("choose");
      setError(
        code === "CHECKOUT_EXPIRED"
          ? isBill
            ? "This bill has expired, so the order was cancelled. You haven't been charged."
            : "This payment has timed out. Go back to your cart to check out again."
          : code === "RATE_LIMITED"
            ? "You've tried to pay several times in a few minutes. Wait a little, then try again."
            : code === "PAYMENTS_NOT_LIVE"
              ? "Card and bank payments aren't switched on yet. Please try again later."
              : "We couldn't open the payment. Check your connection and try again.",
      );
    }
  };

  const payTest = async () => {
    setTesting(true);
    setError(null);
    try {
      if (isBill) await ensureIdentity();
      await markPaidTest({ checkoutId: id, payToken });
      const next = afterPaid();
      if (next !== null || !isBill) router.replace(next ?? routes.orderPlaced(checkoutId));
      else setTesting(false);
    } catch (e) {
      setTesting(false);
      const code = errorCode(e);
      if (code === "ALREADY_PAID") return router.replace(afterPaid() ?? routes.orderPlaced(checkoutId));
      setError(
        code === "CHECKOUT_EXPIRED"
          ? "This payment has timed out. Go back to your cart to check out again."
          : "We couldn't complete the test payment. Try again.",
      );
    }
  };

  if (checkout === undefined) return <PaySkeleton />;
  if (checkout === null) return <NotFound />;
  if (checkout.status === "awaiting_bill") return <BillNotReady />;
  if (expired) return isBill || checkout.payBy ? <BillExpired /> : <Expired />;
  if (paidElsewhere) return <PaidThanks checkout={checkout} />;
  if (paid) return <Confirming checkout={checkout} />;

  if (view === "confirming") return <Confirming checkout={checkout} />;
  if (view === "failed")
    return (
      <Failed
        onAnother={() => {
          setPhase("choose");
          setError(null);
        }}
        onRetry={() => void begin(last?.method === "bank_transfer" || last?.method === "ussd" ? last.method : "card")}
        retrying={opening}
        error={error}
      />
    );
  if (view === "awaiting")
    return (
      <Awaiting
        checkout={checkout}
        checking={checking}
        onCheck={async () => {
          setChecking(true);
          await check();
          setChecking(false);
        }}
      />
    );

  // Bills have no review step to go back to
  const cancelHref = isBill || checkout.payBy
    ? checkout.isOwner !== false && checkout.orders[0]
      ? routes.order(checkout.orders[0]._id)
      : routes.home
    : routes.checkoutReview;

  return (
    <Choose
      checkout={checkout}
      cancelHref={cancelHref}
      method={method}
      setMethod={setMethod}
      live={config?.live ?? false}
      testStep={config?.testStep ?? false}
      configLoading={config === undefined}
      opening={opening}
      testing={testing}
      error={error}
      onPay={() => void begin(method)}
      onTest={() => void payTest()}
    />
  );
}

// ---------------------------------------------------------------------------

function PayHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="bg-surface shadow-[inset_0_-1px_0_var(--color-line)]">
      <div className="mx-auto flex h-[72px] max-w-[1160px] items-center justify-between gap-4 px-8 m:px-4">
        <HomeLogo height={22} />
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest m:hidden">
          <Lock aria-hidden className="size-4" strokeWidth={2} />
          Secure checkout
        </span>
        <span className="flex min-w-[90px] justify-end">{right}</span>
      </div>
    </header>
  );
}

const BackToReview = () => (
  <Link href={routes.checkoutReview} className="inline-flex min-h-11 items-center text-sm font-semibold">
    Back to review
  </Link>
);

function Page({ children, right, top = 170 }: { children: ReactNode; right?: ReactNode; top?: number }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <PayHeader right={right} />
      <main id="main" tabIndex={-1} className="flex justify-center px-4 pb-16 outline-none m:pt-8" style={{ paddingTop: top - 72 }}>
        {children}
      </main>
    </div>
  );
}

const panel = "flex w-[540px] max-w-full flex-col items-center rounded-[24px] bg-surface px-10 py-11 text-center shadow-[inset_0_0_0_1px_var(--color-line)] m:px-5 m:py-8";
const title = "m-0 mt-6 font-display text-[26px] leading-[34px] font-extrabold m:text-[22px] m:leading-7 tracking-[-0.02em] m:text-[23px] m:leading-[30px]";

export function PaySkeleton() {
  return (
    <Page top={128}>
      <LoadingRegion label="Loading payment">
        <Skeleton className="h-[420px] w-[640px] max-w-[calc(100vw-32px)]" rounded={18} />
      </LoadingRegion>
    </Page>
  );
}

function Choose({
  checkout,
  cancelHref,
  method,
  setMethod,
  live,
  testStep,
  configLoading,
  opening,
  testing,
  error,
  onPay,
  onTest,
}: {
  checkout: CheckoutForPay;
  cancelHref: string;
  method: Method;
  setMethod: (m: Method) => void;
  live: boolean;
  testStep: boolean;
  configLoading: boolean;
  opening: boolean;
  testing: boolean;
  error: string | null;
  onPay: () => void;
  onTest: () => void;
}) {
  const total = naira(checkout.totalKobo);
  const onKey = (e: KeyboardEvent) => {
    const i = METHODS.findIndex((x) => x.id === method);
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = METHODS[(i + step + METHODS.length) % METHODS.length]!;
    setMethod(next.id);
    document.getElementById(`meth-${next.id}`)?.focus();
  };
  return (
    <Page top={128}>
      <Reveal className="w-[640px] max-w-full">
        <section
          aria-labelledby="pay-title"
          className="overflow-hidden rounded-[18px] bg-surface shadow-[0_30px_80px_rgba(0,0,0,0.12),inset_0_0_0_1px_var(--color-line)]"
        >
          <div className="flex items-center justify-between gap-3 px-[22px] py-[18px] shadow-[inset_0_-1px_0_#ECEEE8]">
            <div className="flex min-w-0 items-center gap-2.5">
              <Wordmark height={18} />
              <div className="min-w-0">
                {checkout.contact.email ? <div className="truncate text-xs text-subtle">{checkout.contact.email}</div> : null}
                <h1 id="pay-title" className="m-0 text-sm font-semibold">
                  Pay <span className="font-display font-extrabold">{total}</span> to Farmkeke
                </h1>
              </div>
            </div>
            <Link
              href={cancelHref}
              className="inline-flex min-h-11 flex-none items-center gap-1.5 rounded-full bg-canvas px-3.5 text-sm font-semibold text-ink"
            >
              <X aria-hidden className="size-[18px]" strokeWidth={2} />
              Cancel
            </Link>
          </div>
          {checkout.payBy ? <BillSummary checkout={checkout} /> : null}
          <div className="grid grid-cols-[200px_minmax(0,1fr)] m:grid-cols-1">
            <div className="flex flex-col gap-1 bg-canvas px-3 py-4">
              <div id="pay-with" className="px-3.5 pb-1.5 text-[11px] font-bold tracking-[0.04em] text-[#9A9E95]">
                PAY WITH
              </div>
              <div role="radiogroup" aria-labelledby="pay-with" onKeyDown={onKey} className="flex flex-col gap-1">
                {METHODS.map((m) => {
                  const on = m.id === method;
                  return (
                    <button
                      key={m.id}
                      id={`meth-${m.id}`}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      tabIndex={on ? 0 : -1}
                      onClick={() => setMethod(m.id)}
                      className={`flex h-[46px] w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 px-3.5 text-left text-sm font-semibold ${
                        on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "bg-transparent text-muted"
                      }`}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-6 m:p-5">
              <h2 className="m-0 text-center text-base font-bold">{PANEL[method].title}</h2>
              <p className="sm mt-2 text-center">{PANEL[method].body}</p>
              <div className="mt-[18px] flex flex-col gap-3">
                {configLoading ? (
                  <Skeleton className="h-[50px] w-full" rounded={10} />
                ) : live ? (
                  <button
                    type="button"
                    onClick={onPay}
                    disabled={opening}
                    aria-busy={opening || undefined}
                    className="flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 bg-ink text-[15px] font-semibold text-white disabled:opacity-60"
                  >
                    {opening ? <RotateCw aria-hidden className="size-4 animate-spin" /> : null}
                    Pay {total}
                  </button>
                ) : null}
                {!configLoading && testStep ? (
                  <div className="rounded-xl bg-soft p-3">
                    <Button variant="lime" fullWidth className="min-h-[50px] rounded-[10px]" loading={testing} onClick={onTest}>
                      Pay now (test)
                    </Button>
                    <p className="cap mt-2 text-center">Test mode: marks this order paid. No money moves.</p>
                  </div>
                ) : null}
                {!configLoading && !live && !testStep ? (
                  <p className="sm rounded-xl bg-pend-bg p-3 text-center text-pend">
                    Payments are paused for a moment. Please try again shortly. Your cart is saved.
                  </p>
                ) : null}
                {error ? (
                  <p role="alert" className="field-error mt-0 text-center">
                    {error}
                  </p>
                ) : null}
              </div>
              <div className="mt-[18px] flex items-center justify-center gap-1.5 text-xs text-subtle">
                <Lock aria-hidden className="size-3.5" strokeWidth={2} />
                Secured by Paystack
              </div>
            </div>
          </div>
        </section>
      </Reveal>
    </Page>
  );
}

const methodLabel = (m: CheckoutForPay["lastAttempt"]) =>
  m?.cardLast4
    ? `Card ending ${m.cardLast4}`
    : m?.method === "bank_transfer"
      ? "Bank transfer"
      : m?.method === "ussd"
        ? "USSD"
        : "Card";

function Confirming({ checkout }: { checkout: CheckoutForPay }) {
  return (
    <Page>
      <section role="status" aria-live="polite" className={`${panel} px-10 py-12`}>
        <span
          aria-hidden
          className="block size-[72px] animate-spin rounded-full border-[6px] border-lime-soft border-t-forest [animation-duration:0.9s]"
        />
        <h1 className={`${title} mt-7`}>Confirming your payment</h1>
        <p className="p mt-2.5">This usually takes a few seconds. Please don&apos;t close or refresh this page.</p>
        <div className="mt-7 flex w-full items-center justify-between rounded-[14px] bg-soft px-[18px] py-4 text-sm">
          <span className="text-muted">{methodLabel(checkout.lastAttempt)}</span>
          <span className="font-display text-lg font-extrabold">{naira(checkout.totalKobo)}</span>
        </div>
        <div className="mt-[18px] flex items-center gap-2 text-[13px] font-semibold text-forest">
          <ShieldCheck aria-hidden className="size-4" strokeWidth={1.75} />
          Your money will be held safely until delivery
        </div>
      </section>
    </Page>
  );
}

function Failed({
  onAnother,
  onRetry,
  retrying,
  error,
}: {
  onAnother: () => void;
  onRetry: () => void;
  retrying: boolean;
  error: string | null;
}) {
  return (
    <Page right={<BackToReview />} top={140}>
      <section role="alert" className={panel}>
        <span aria-hidden className="flex size-[72px] items-center justify-center rounded-full bg-err-bg text-err">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <path d="M2 10h20" />
            <path d="m15 15 4 4" />
            <path d="m19 15-4 4" />
          </svg>
        </span>
        <h1 className={title}>Your payment didn&apos;t go through</h1>
        <p className="p mt-2.5">Your bank declined this payment. You haven&apos;t been charged, and your cart is saved.</p>
        <div className="mt-[22px] w-full rounded-[14px] bg-soft px-4 py-3.5 text-left text-[13px] leading-5 text-ink-3">
          <div className="mb-1 font-semibold">You could try:</div>
          <ul className="m-0 list-none p-0">
            <li>· Checking the card number, expiry date and CVV</li>
            <li>· Making sure the card has enough balance and online payments turned on</li>
            <li>· Paying by bank transfer or USSD instead</li>
          </ul>
        </div>
        <div className="mt-6 grid w-full grid-cols-2 gap-2.5 m:grid-cols-1">
          <Button variant="ghost" size="lg" className="min-h-[54px] px-[22px]" onClick={onAnother}>
            Use another method
          </Button>
          <Button variant="lime" size="lg" className="min-h-[54px] px-[22px]" loading={retrying} onClick={onRetry}>
            Try again
          </Button>
        </div>
        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : null}
        <p className="mt-[18px] text-[13px] text-subtle">
          Still stuck?{" "}
          <Link href={routes.contact} className="font-semibold">
            Chat with support
          </Link>
        </p>
      </section>
    </Page>
  );
}

function Awaiting({
  checkout,
  checking,
  onCheck,
}: {
  checkout: CheckoutForPay;
  checking: boolean;
  onCheck: () => void;
}) {
  const last = checkout.lastAttempt;
  const started = last?.startedAt;
  return (
    <Page right={<BackToReview />} top={130}>
      <section role="status" aria-live="polite" className={panel}>
        <span aria-hidden className="flex size-[72px] items-center justify-center rounded-full bg-pend-bg text-pend">
          <Clock className="size-[34px]" strokeWidth={1.75} />
        </span>
        <h1 className={title}>Waiting for your bank to confirm</h1>
        <p className="p mt-2.5">
          Bank transfers can take up to 10 minutes. This page updates by itself, and we&apos;ll text you once your payment
          is confirmed.
        </p>
        <ol className="m-0 mt-[22px] w-full list-none rounded-[14px] bg-soft px-[18px] py-1.5 text-left">
          <li className="flex items-center gap-3 py-2.5 text-sm">
            <span aria-hidden className="flex size-6 flex-none items-center justify-center rounded-full bg-forest text-white">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <span className="flex-1">
              {last?.method === "ussd" ? "Payment started" : "Transfer started"}
              <span className="sr-only"> (done)</span>
            </span>
            {started ? <span className="text-xs text-subtle">{hm(started)}</span> : null}
          </li>
          <li className="flex items-center gap-3 py-2.5 text-sm font-semibold" aria-current="step">
            <span aria-hidden className="size-6 flex-none rounded-full bg-lime shadow-[0_0_0_4px_var(--color-lime-soft)]" />
            <span className="flex-1">Waiting for the bank</span>
            <span className="text-xs font-normal text-subtle">Now</span>
          </li>
          <li className="flex items-center gap-3 py-2.5 text-sm text-[#9A9E95]">
            <span aria-hidden className="size-6 flex-none rounded-full shadow-[inset_0_0_0_1.5px_#C9CEC2]" />
            <span className="flex-1">
              Orders sent to the farms<span className="sr-only"> (to come)</span>
            </span>
          </li>
        </ol>
        <div className="mt-4 flex w-full justify-between text-[13px] text-muted-2">
          <span>Amount</span>
          <span className="font-semibold text-ink">{naira(checkout.totalKobo)}</span>
        </div>
        <div className="mt-1.5 flex w-full justify-between text-[13px] text-muted-2">
          <span>Payment reference</span>
          <span className="font-semibold text-ink">{last?.reference ?? checkout.reference}</span>
        </div>
        <Button
          variant="ghost"
          fullWidth
          className="mt-6 min-h-[52px] rounded-[14px]"
          loading={checking}
          icon={<RotateCw aria-hidden className="size-[18px]" strokeWidth={1.75} />}
          onClick={onCheck}
        >
          Check again
        </Button>
        <p className="mt-4 text-[13px] text-subtle">It&apos;s safe to leave this page. Don&apos;t send the money a second time.</p>
      </section>
    </Page>
  );
}

function Expired() {
  return (
    <Page top={140}>
      <section className={panel}>
        <span aria-hidden className="flex size-[72px] items-center justify-center rounded-full bg-pend-bg text-pend">
          <Clock className="size-[34px]" strokeWidth={1.75} />
        </span>
        <h1 className={title}>This payment has timed out</h1>
        <p className="p mt-2.5">
          We hold your items for an hour while you pay. You haven&apos;t been charged, and your cart is saved, so you can
          check out again.
        </p>
        <ButtonLink href={routes.cart} variant="lime" size="lg" fullWidth className="mt-6 min-h-[54px]">
          Back to cart
        </ButtonLink>
      </section>
    </Page>
  );
}

/** A delivery bill: each farm's products and delivery, and when it must be paid by. */
function BillSummary({ checkout }: { checkout: CheckoutForPay }) {
  return (
    <div className="px-[22px] py-4 text-sm shadow-[inset_0_-1px_0_#ECEEE8]">
      <h2 className="m-0 text-sm font-bold">Your bill</h2>
      <ul className="m-0 mt-2 list-none p-0">
        {checkout.orders.map((o) => (
          <li key={o._id} className="py-1.5">
            <div className="flex justify-between gap-3">
              <span className="font-semibold">
                {o.number} · {o.farmName}
              </span>
              <span className="font-semibold">{naira(o.totalKobo)}</span>
            </div>
            <div className="cap">
              Products {naira(o.itemsTotalKobo)} · Delivery {naira(o.deliveryFeeKobo)}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex justify-between gap-3 pt-2 shadow-[inset_0_1px_0_#EEF0EB]">
        <span className="font-semibold">Total</span>
        <span className="font-display text-base font-extrabold text-forest">{naira(checkout.totalKobo)}</span>
      </div>
      {checkout.payBy ? (
        <p className="cap mt-2">
          Pay by <strong className="text-ink">{dateTime(checkout.payBy)}</strong>, or the order is cancelled. The farm has it packed and
          ready for the rider.
        </p>
      ) : null}
    </div>
  );
}

/** Paying someone else's bill through the link: done. */
function PaidThanks({ checkout }: { checkout: CheckoutForPay }) {
  return (
    <Page top={140}>
      <section role="status" className={panel}>
        <span aria-hidden className="flex size-[72px] items-center justify-center rounded-full bg-ok-bg text-ok">
          <ShieldCheck className="size-[34px]" strokeWidth={1.75} />
        </span>
        <h1 className={title}>Paid. Thank you</h1>
        <p className="p mt-2.5">
          {naira(checkout.totalKobo)} is held safely by Farmkeke. {checkout.contact.name || "The shopper"} will hear when the rider is on
          the way.
        </p>
        <ButtonLink href={routes.home} variant="ghost" size="lg" fullWidth className="mt-6 min-h-[54px]">
          Go to Farmkeke
        </ButtonLink>
      </section>
    </Page>
  );
}

/** A delivery order whose farms haven't all answered, or whose delivery isn't priced yet. */
function BillNotReady() {
  return (
    <Page top={140}>
      <section className={panel}>
        <span aria-hidden className="flex size-[72px] items-center justify-center rounded-full bg-pend-bg text-pend">
          <Clock className="size-[34px]" strokeWidth={1.75} />
        </span>
        <h1 className={title}>Your bill isn&apos;t ready yet</h1>
        <p className="p mt-2.5">
          The farm needs to accept, then we arrange a rider and price the delivery. We&apos;ll send your bill by email, text and in the
          app. There&apos;s nothing to pay until then.
        </p>
        <ButtonLink href={routes.myOrders} variant="lime" size="lg" fullWidth className="mt-6 min-h-[54px]">
          See your orders
        </ButtonLink>
      </section>
    </Page>
  );
}

/** A delivery bill that wasn't paid within 12 hours: its orders were cancelled. */
function BillExpired() {
  return (
    <Page top={140}>
      <section className={panel}>
        <span aria-hidden className="flex size-[72px] items-center justify-center rounded-full bg-pend-bg text-pend">
          <Clock className="size-[34px]" strokeWidth={1.75} />
        </span>
        <h1 className={title}>This bill has expired</h1>
        <p className="p mt-2.5">
          It wasn&apos;t paid within 12 hours, so the order was cancelled and the farm was told. You haven&apos;t been charged. You can
          order again any time.
        </p>
        <ButtonLink href={routes.shop} variant="lime" size="lg" fullWidth className="mt-6 min-h-[54px]">
          Shop again
        </ButtonLink>
      </section>
    </Page>
  );
}

function NotFound() {
  return (
    <Page top={140}>
      <section className={panel}>
        <span aria-hidden className="tile size-[72px] rounded-full">
          <CreditCard className="size-[34px]" strokeWidth={1.75} />
        </span>
        <h1 className={title}>We couldn&apos;t find this payment</h1>
        <p className="p mt-2.5">
          It may have been started on another device or account. If you placed an order, you can find it with your order
          number and phone number.
        </p>
        <div className="mt-6 grid w-full grid-cols-2 gap-2.5 m:grid-cols-1">
          <ButtonLink href={routes.cart} variant="ghost" size="lg" fullWidth className="min-h-[54px]">
            Back to cart
          </ButtonLink>
          <ButtonLink href={routes.findOrder} variant="lime" size="lg" fullWidth className="min-h-[54px]">
            Find my order
          </ButtonLink>
        </div>
      </section>
    </Page>
  );
}
