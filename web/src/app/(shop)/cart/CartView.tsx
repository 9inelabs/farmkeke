"use client";

// W-20 Cart, W-20b Cart empty and W-20c Items changed.
// Lines render at once from the browser cart; checkout.quote then checks
// prices and stock and the page shows anything that changed (W-20c).
import { ChevronLeft, Info, ShieldCheck, ShoppingBasket, Trash, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { capitalise, groupByFarm, QtyStepper, Thumb, useHydrated, useQuote } from "@/components/cart/parts";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { CartChange, Quote } from "@/convex/returns/checkout";
import { useViewer } from "@/lib/auth";
import { cart, type CartLine } from "@/lib/cart";
import { initials, naira, plural, tintFor } from "@/lib/format";
import { Reveal } from "@/lib/motion";
import { routes } from "@/lib/routes";

const POPULAR = ["Tomatoes", "Yam", "Eggs", "Plantain", "Catfish"];
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const word = (n: number) => WORDS[n] ?? String(n);
const keyOf = (l: { listingId: string; unitId: string }) => `${l.listingId}:${l.unitId}`;

/** "One price went up and one item sold out." */
function changeSentence(changes: CartChange[]) {
  const them = changes.length === 1 ? "it" : "them";
  const up = changes.filter((c) => c.kind === "price" && (c.priceKobo ?? 0) > (c.oldPriceKobo ?? 0)).length;
  const down = changes.filter((c) => c.kind === "price" && (c.priceKobo ?? 0) < (c.oldPriceKobo ?? 0)).length;
  const sold = changes.filter((c) => c.kind === "sold_out").length;
  const gone = changes.filter((c) => c.kind === "unavailable").length;
  const qty = changes.filter((c) => c.kind === "quantity").length;
  const parts = [
    up ? `${word(up)} ${up === 1 ? "price" : "prices"} went up` : "",
    down ? `${word(down)} ${down === 1 ? "price" : "prices"} went down` : "",
    sold ? `${word(sold)} ${sold === 1 ? "item" : "items"} sold out` : "",
    gone ? `${word(gone)} ${gone === 1 ? "item is" : "items are"} no longer available` : "",
    qty ? `${word(qty)} ${qty === 1 ? "quantity" : "quantities"} changed to what's in stock` : "",
  ].filter(Boolean);
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0]!;
  return `${capitalise(joined)}. Check ${them} below before you pay.`;
}

/** The cart with the server's prices and quantities, minus what can't be bought. */
export function correctedLines(lines: CartLine[], quote: Quote): CartLine[] {
  const server = new Map(quote.farms.flatMap((f) => f.lines.map((l) => [keyOf(l), l] as const)));
  return lines.flatMap((l) => {
    const s = server.get(keyOf(l));
    if (!s) return [];
    return [{ ...l, priceKobo: s.priceKobo, quantity: s.quantity, stock: s.stock, minOrder: s.minOrder, imageUrl: s.imageUrl ?? l.imageUrl }];
  });
}

export function CartView() {
  const { quote, lines } = useQuote();
  const { status } = useViewer();
  const router = useRouter();
  const hydrated = useHydrated();

  if (!hydrated) return <CartSkeleton />;
  if (lines.length === 0) return <EmptyCart />;

  const groups = groupByFarm(lines);
  const changes = quote?.changes ?? [];
  const changeFor = new Map(changes.map((c) => [keyOf(c), c]));
  const serverLine = new Map((quote?.farms ?? []).flatMap((f) => f.lines.map((l) => [keyOf(l), l] as const)));
  const farmInfo = new Map((quote?.farms ?? []).map((f) => [f.farmId, f]));
  const blocked = (l: CartLine) => {
    const k = changeFor.get(keyOf(l))?.kind;
    return k === "sold_out" || k === "unavailable";
  };
  const priceOf = (l: CartLine) => serverLine.get(keyOf(l))?.priceKobo ?? l.priceKobo;
  const qtyOf = (l: CartLine) => serverLine.get(keyOf(l))?.quantity ?? l.quantity;
  const available = lines.filter((l) => !blocked(l));
  const itemsKobo = available.reduce((s, l) => s + priceOf(l) * qtyOf(l), 0);
  const anyBlocked = available.length < lines.length;
  const changed = changes.length > 0;

  const proceed = () => {
    if (changed && quote) cart.replace(correctedLines(lines, quote));
    router.push(routes.checkout);
  };

  return (
    <div className="wrap pt-8 pb-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h1 text-[32px] leading-10 m:text-[26px] m:leading-[34px]">Your cart</h1>
          <p className="p mt-1">
            {plural(lines.length, "item")} from {plural(groups.length, "farm")}
          </p>
        </div>
        {changed ? null : (
          <Link href={routes.shop} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
            <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
            Continue shopping
          </Link>
        )}
      </div>

      {changed ? (
        <Reveal>
          <div
            role="status"
            className="mb-5 flex items-start gap-3.5 rounded-2xl bg-pend-bg px-5 py-[18px] shadow-[inset_0_0_0_1px_#F2DDB5]"
          >
            <TriangleAlert aria-hidden className="mt-px size-[22px] flex-none text-pend" strokeWidth={1.75} />
            <div className="flex-1">
              <div className="text-[15px] font-semibold text-[#5E3E08]">
                {plural(changes.length, "item")} changed since you added {changes.length === 1 ? "it" : "them"}
              </div>
              <div className="sm mt-0.5 text-[#7A5A1E]">{changeSentence(changes)}</div>
            </div>
          </div>
        </Reveal>
      ) : null}

      <div className="grid grid-cols-[minmax(0,8fr)_minmax(0,4fr)] items-start gap-7 m:grid-cols-1">
        <div className="flex flex-col gap-5">
          {changed ? null : (
            <div className="flex items-center gap-3 rounded-[14px] bg-[#F4F7EE] px-[18px] py-3.5 text-sm text-[#2E3A28]">
              <Info aria-hidden className="size-5 flex-none text-forest" strokeWidth={1.75} />
              Each farm&apos;s items become their own order, with their own delivery. You pay once for everything.
            </div>
          )}

          {groups.map((g, gi) => {
            const info = farmInfo.get(g.farmId);
            const subtotal = g.lines.filter((l) => !blocked(l)).reduce((s, l) => s + priceOf(l) * qtyOf(l), 0);
            return (
              <section key={g.farmId} aria-labelledby={`farm-${g.farmId}`} className="card overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-[18px] shadow-[inset_0_-1px_0_#EEF0EB] m:px-4">
                  <span
                    aria-hidden
                    className="flex size-10 flex-none items-center justify-center rounded-full font-display text-[13px] font-bold text-forest"
                    style={{ background: tintFor(g.farmId) }}
                  >
                    {initials(g.farmName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div id={`farm-${g.farmId}`} className="text-[15px] font-semibold">
                      {g.farmName}
                    </div>
                    {info?.farmArea || info?.acceptsWithinHours ? (
                      <div className="cap">
                        {[
                          info.farmArea,
                          info.acceptsWithinHours ? `Usually accepts within ${plural(info.acceptsWithinHours, "hour")}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    ) : null}
                  </div>
                  <span className="badge bg-canvas text-ink-3">Order {gi + 1}</span>
                </div>
                <ul className="m-0 list-none p-0">
                  {g.lines.map((l) => (
                    <CartRow
                      key={keyOf(l)}
                      line={l}
                      change={changeFor.get(keyOf(l))}
                      priceKobo={priceOf(l)}
                      quantity={qtyOf(l)}
                    />
                  ))}
                </ul>
                <div className="flex justify-between bg-[#FAFBF8] px-6 py-3.5 text-sm shadow-[inset_0_1px_0_#EEF0EB] m:px-4">
                  <span className="text-muted">{g.farmName} subtotal</span>
                  <span className="font-bold">{naira(subtotal)}</span>
                </div>
              </section>
            );
          })}
        </div>

        <aside aria-labelledby="cart-summary" className="card p-6">
          <h2 id="cart-summary" className="h3 text-lg leading-[26px]">
            Order summary
          </h2>
          <div className="mt-3.5">
            <div className="flex justify-between py-[7px] text-sm text-ink-3">
              <span>{anyBlocked ? `Items (${available.length} available)` : `Items (${lines.length})`}</span>
              <span>{naira(itemsKobo)}</span>
            </div>
            <div className="flex justify-between py-[7px] text-sm text-ink-3">
              <span>Delivery</span>
              <span className="text-subtle">Chosen at checkout</span>
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between pt-4 shadow-[inset_0_1px_0_#EEF0EB]">
            <span className="font-semibold">Subtotal</span>
            <span className="font-display text-2xl font-extrabold text-forest">{naira(itemsKobo)}</span>
          </div>
          <Button
            variant="lime"
            size="lg"
            fullWidth
            className="mt-5 min-h-[54px]"
            onClick={proceed}
            disabled={available.length === 0}
          >
            {changed ? `Continue with ${plural(available.length, "item")}` : "Go to checkout"}
          </Button>
          {changed ? (
            anyBlocked ? (
              <div className="cap mt-3 text-center">Sold-out items are left out of your order</div>
            ) : null
          ) : (
            <>
              <div className="mt-[18px] flex gap-2.5 rounded-xl bg-[#F4F7EE] p-3.5">
                <ShieldCheck aria-hidden className="size-5 flex-none text-forest" strokeWidth={1.75} />
                <div className="sm text-[#2E3A28]">
                  Your payment is held by Farmkeke and released to each farm only after you confirm delivery.
                </div>
              </div>
              {status === "signed-in" ? null : (
                <div className="cap mt-3.5 text-center">No account needed. Check out as a guest.</div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function CartRow({
  line: l,
  change,
  priceKobo,
  quantity,
}: {
  line: CartLine;
  change?: CartChange;
  priceKobo: number;
  quantity: number;
}) {
  const gone = change?.kind === "sold_out" || change?.kind === "unavailable";
  const priced = change?.kind === "price";
  const diff = priced ? (change.priceKobo ?? 0) - (change.oldPriceKobo ?? 0) : 0;
  const unit = capitalise(l.unitSingular);
  return (
    <li
      className="flex items-center gap-4 px-6 py-[18px] [&+&]:shadow-[inset_0_1px_0_#EEF0EB] m:flex-wrap m:px-4"
      style={{ background: gone ? "#FCF7F7" : change ? "#FFFCF6" : undefined }}
    >
      <Thumb id={l.listingId} imageUrl={l.imageUrl} size={76} radius={14} dim={gone} />
      <div className="min-w-0 flex-1">
        {gone ? (
          <div className="text-[15px] font-semibold text-subtle">{l.name}</div>
        ) : (
          <Link href={routes.product(l.listingId)} className="text-[15px] font-semibold text-ink hover:text-forest">
            {l.name}
          </Link>
        )}
        <div className="sm mt-0.5">
          {unit} ·{" "}
          {gone ? (
            naira(l.priceKobo)
          ) : priced ? (
            <>
              <span className="text-[#9A9E95] line-through">
                <span className="sr-only">was </span>
                {naira(change.oldPriceKobo)}
              </span>{" "}
              <span className="sr-only">now </span>
              {naira(priceKobo)} each
            </>
          ) : (
            `${naira(priceKobo)} each`
          )}
        </div>
        {gone ? (
          <span className="badge b-err mt-2">
            {change.kind === "sold_out" ? "Sold out · won't be charged" : "No longer available · won't be charged"}
          </span>
        ) : priced ? (
          <span className="badge b-pend mt-2">
            {diff > 0 ? `Price went up by ${naira(diff)}` : `Price went down by ${naira(-diff)}`}
          </span>
        ) : change?.kind === "quantity" ? (
          <span className="badge b-pend mt-2">Changed to {quantity}, what&apos;s in stock</span>
        ) : (
          <button
            type="button"
            onClick={() => cart.remove(l)}
            className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[13px] font-semibold text-muted-2 hover:text-ink"
          >
            <Trash aria-hidden className="size-3.5" strokeWidth={2} />
            Remove<span className="sr-only"> {l.name}</span>
          </button>
        )}
      </div>
      {gone ? (
        <div className="flex gap-2 m:w-full m:justify-end">
          <ButtonLink href={routes.search(l.name)} variant="ghost" size="sm">
            Find similar
          </ButtonLink>
          <Button variant="ghost" size="sm" onClick={() => cart.remove(l)}>
            Remove<span className="sr-only"> {l.name}</span>
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-4 m:w-full m:justify-between m:pl-[92px]">
          <QtyStepper line={{ ...l, quantity }} />
          <div className="w-[110px] text-right font-display text-base font-extrabold m:w-auto">
            {naira(priceKobo * quantity)}
          </div>
        </div>
      )}
    </li>
  );
}

function EmptyCart() {
  return (
    <div className="wrap pt-12 pb-24">
      <Reveal>
        <section className="card flex flex-col items-center gap-4 px-8 py-[72px] text-center m:px-5 m:py-12">
          <span className="flex size-[88px] items-center justify-center rounded-[28px] bg-tint text-forest" aria-hidden>
            <ShoppingBasket className="size-10" strokeWidth={1.5} />
          </span>
          <h1 className="m-0 font-display text-[30px] leading-[38px] font-extrabold tracking-[-0.02em] m:text-[26px] m:leading-[34px]">
            Your cart is ready for fresh picks
          </h1>
          <p className="p max-w-[460px]">
            Add produce from verified farms near you. Your payment stays protected until your order arrives.
          </p>
          <ButtonLink href={routes.shop} variant="lime" className="mt-2">
            Start shopping
          </ButtonLink>
          <div className="mt-[18px] flex flex-wrap items-center justify-center gap-2">
            <span className="cap">Popular now:</span>
            {POPULAR.map((p) => (
              <Link
                key={p}
                href={routes.search(p)}
                className="inline-flex min-h-11 items-center rounded-full bg-surface px-4 text-sm font-medium text-ink shadow-[inset_0_0_0_1px_#DCE0D6] hover:text-ink"
              >
                {p}
              </Link>
            ))}
          </div>
        </section>
        <div className="card mt-5 flex flex-wrap items-center gap-4 px-6 py-5">
          <div className="min-w-[240px] flex-1">
            <div className="text-[15px] font-semibold">Placed an order as a guest?</div>
            <div className="mt-0.5 text-[13px] text-muted-2">Find it with your order number and phone number.</div>
          </div>
          <ButtonLink href={routes.findOrder} variant="ghost">
            Find my order
          </ButtonLink>
        </div>
      </Reveal>
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="wrap pt-8 pb-24">
      <LoadingRegion label="Loading your cart">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-2 h-5 w-40" />
        <div className="mt-6 grid grid-cols-[minmax(0,8fr)_minmax(0,4fr)] items-start gap-7 m:grid-cols-1">
          <div className="flex flex-col gap-5">
            <Skeleton className="h-[52px] w-full" rounded={14} />
            <Skeleton className="h-[260px] w-full" rounded={18} />
          </div>
          <Skeleton className="h-[300px] w-full" rounded={18} />
        </div>
      </LoadingRegion>
    </div>
  );
}
