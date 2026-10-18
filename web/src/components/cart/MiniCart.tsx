"use client";

// W-08 Mini-cart drawer. Opened with miniCart.open() from the header and
// add-to-cart buttons; mounted once in the root layout. Shows what was just
// added, the cart grouped by farm (one order per farm), and the subtotal.
import { Check, Info, ShoppingBasket } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense, useEffect } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Dialog";
import { miniCart, useCart } from "@/lib/cart";
import { naira, plural } from "@/lib/format";
import { routes } from "@/lib/routes";
import { capitalise, groupByFarm, QtyStepper, Thumb } from "./parts";

export function MiniCart() {
  const open = miniCart.useOpen();
  const added = miniCart.useLastAdded();
  const { lines, itemsTotalKobo } = useCart();
  const groups = groupByFarm(lines);

  return (
    <>
      <Suspense fallback={null}>
        <CloseOnNavigate />
      </Suspense>
      <Drawer
        open={open}
        onClose={miniCart.close}
        width={440}
        title={
          <>
            Your cart{" "}
            <span className="font-sans text-sm font-medium text-subtle">({plural(lines.length, "item")})</span>
          </>
        }
        titleClassName="m-0 font-display text-xl font-bold"
        headerClassName="flex items-center justify-between gap-4 px-6 py-5 shadow-[inset_0_-1px_0_#EEF0EB] m:px-4"
        footerClassName="flex flex-col gap-3.5 px-6 pt-5 pb-6 shadow-[inset_0_1px_0_#EEF0EB] m:px-4"
        footer={
          lines.length > 0 ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Subtotal</span>
                <span className="font-display text-[22px] font-extrabold text-forest">{naira(itemsTotalKobo)}</span>
              </div>
              <div className="-mt-2 text-xs text-subtle">Delivery fee is added at checkout</div>
              <div className="grid grid-cols-2 gap-2.5">
                <ButtonLink href={routes.cart} variant="ghost" fullWidth className="min-h-[50px] rounded-[14px]" onClick={miniCart.close}>
                  View cart
                </ButtonLink>
                <ButtonLink href={routes.checkout} variant="lime" fullWidth className="min-h-[50px] rounded-[14px]" onClick={miniCart.close}>
                  Checkout
                </ButtonLink>
              </div>
            </>
          ) : undefined
        }
      >
        {added ? (
          <div
            role="status"
            className="mt-4 flex items-center gap-2.5 rounded-xl bg-ok-bg px-3.5 py-3 text-sm font-semibold text-ok"
          >
            <Check aria-hidden className="size-[18px] flex-none" strokeWidth={2.25} />
            {added} added to your cart
          </div>
        ) : null}

        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="tile size-16 rounded-[20px]" aria-hidden>
              <ShoppingBasket className="size-7" strokeWidth={1.5} />
            </span>
            <p className="p">Your cart is empty.</p>
            <ButtonLink href={routes.shop} variant="lime" onClick={miniCart.close}>
              Start shopping
            </ButtonLink>
          </div>
        ) : (
          <div className="pt-2">
            {groups.map((g, gi) => (
              <section
                key={g.farmId}
                aria-label={g.farmName}
                className={gi === 0 ? "pt-3.5" : "mt-2 pt-[18px] shadow-[inset_0_1px_0_#E6E8E2]"}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{g.farmName}</span>
                  <span className="text-xs text-subtle">
                    Order {gi + 1} of {groups.length}
                  </span>
                </div>
                <ul className="m-0 list-none p-0">
                  {g.lines.map((l) => (
                    <li
                      key={`${l.listingId}:${l.unitId}`}
                      className="flex items-center gap-3 py-3 [&+&]:shadow-[inset_0_1px_0_#EEF0EB]"
                    >
                      <Thumb id={l.listingId} imageUrl={l.imageUrl} size={56} radius={12} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{l.name}</div>
                        <div className="text-xs text-subtle">
                          {capitalise(l.unitSingular)} · {naira(l.priceKobo)}
                        </div>
                      </div>
                      <QtyStepper line={l} size="sm" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {groups.length > 1 ? (
              <div className="mt-3.5 flex gap-2.5 rounded-xl bg-[#F4F7EE] px-3.5 py-3 text-[13px] leading-[18px] text-[#3B4636]">
                <Info aria-hidden className="size-[18px] flex-none text-forest" strokeWidth={1.75} />
                Items from different farms become separate orders, each delivered on its own.
              </div>
            ) : null}
          </div>
        )}
      </Drawer>
    </>
  );
}

/** Following a link (e.g. a product inside the drawer) closes it. */
function CloseOnNavigate() {
  const pathname = usePathname();
  useEffect(() => {
    miniCart.close();
  }, [pathname]);
  return null;
}
