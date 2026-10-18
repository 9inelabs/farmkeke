"use client";

// W-52b Payment released: shown after confirming receipt, with a quick star
// rating that opens W-57 with the stars already chosen.
import { Check, Star } from "lucide-react";
import Link from "next/link";
import { AuthCard } from "@/components/account/AuthLayouts";
import { FocusMissing, FocusSkeleton, OrdersLink } from "@/components/orders/FocusBits";
import { useOrder } from "@/components/orders/useOrder";
import { ButtonLink } from "@/components/ui/Button";
import { useViewer } from "@/lib/auth";
import { naira } from "@/lib/format";
import { routes } from "@/lib/routes";

export function ReleasedView({ orderId }: { orderId: string }) {
  const access = useOrder(orderId);
  const { status } = useViewer();
  if (access.state === "loading") return <FocusSkeleton orderId={orderId} />;
  if (access.state === "missing") return <FocusMissing orderId={orderId} />;
  const o = access.order;
  const released = o.escrow === "released" || o.status === "completed";
  return (
    <AuthCard width={540} top={64} padding="40px 36px" center headerRight={<OrdersLink orderId={orderId} />}>
      <span aria-hidden className="inline-flex size-[76px] items-center justify-center rounded-full bg-lime text-forest">
        <Check className="size-9" strokeWidth={2.5} />
      </span>
      <h1 className="m-0 mt-[22px] font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em]">Thanks for confirming</h1>
      <p className="p mt-2">
        {released
          ? `${naira(o.totalKobo)} has been released to ${o.farmName} for order ${o.number}.`
          : `${naira(o.totalKobo)} goes to ${o.farmName} for order ${o.number} once our team's hold is lifted.`}
      </p>
      {o.reviewed ? null : (
        <div className="mt-6 rounded-[18px] bg-[#F7FAF1] p-5 text-left shadow-[inset_0_0_0_1px_#DCE9C3]">
          <h2 className="m-0 text-base font-bold">How was your order?</h2>
          <div className="mt-0.5 text-[13px] text-muted">Your rating helps other shoppers and helps the farm grow.</div>
          <div className="mt-3.5 flex gap-1.5" role="group" aria-label="Rate from 1 to 5 stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <Link
                key={n}
                href={`${routes.review(o._id)}?rating=${n}`}
                aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
                className="flex size-12 items-center justify-center rounded-xl bg-white shadow-[inset_0_0_0_1px_#DCE0D6] hover:shadow-[inset_0_0_0_2px_var(--color-forest)]"
              >
                <Star aria-hidden className="size-6 text-[#C9CEC2]" strokeWidth={1.75} />
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="mt-[18px] grid grid-cols-2 gap-2.5 m:grid-cols-1">
        <ButtonLink href={status === "signed-in" ? routes.myOrders : routes.order(o._id)} variant="ghost" fullWidth className="min-h-[52px] rounded-[14px]">
          {status === "signed-in" ? "Back to orders" : "Back to order"}
        </ButtonLink>
        <ButtonLink href={routes.shop} variant="lime" fullWidth className="min-h-[52px] rounded-[14px]">
          Shop again
        </ButtonLink>
      </div>
    </AuthCard>
  );
}
