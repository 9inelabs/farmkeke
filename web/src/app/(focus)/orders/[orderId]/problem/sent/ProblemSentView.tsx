"use client";

// W-53b Problem reported: the case number and when the farm must reply.
import { useConvexAuth, useQuery } from "convex/react";
import { ShieldCheck } from "lucide-react";
import { AuthCard } from "@/components/account/AuthLayouts";
import { FocusMissing, FocusSkeleton, OrdersLink } from "@/components/orders/FocusBits";
import { dayTime } from "@/components/orders/format";
import { ButtonLink } from "@/components/ui/Button";
import { api, type Id } from "@/convex/api";
import type { DisputeDetail } from "@/convex/returns/orders";
import { useViewer } from "@/lib/auth";
import { plural } from "@/lib/format";
import { routes } from "@/lib/routes";

export function ProblemSentView({ orderId }: { orderId: string }) {
  const { isLoading } = useConvexAuth();
  const { status } = useViewer();
  const d = useQuery(api.disputes.forOrder, isLoading ? "skip" : { orderId: orderId as Id<"orders"> }) as
    | DisputeDetail
    | null
    | undefined;
  if (d === undefined) return <FocusSkeleton orderId={orderId} />;
  if (d === null) return <FocusMissing orderId={orderId} />;
  const units = d.items.reduce((s, it) => s + it.quantity, 0);
  const rows: Array<[string, string]> = [
    ["Case number", d.number],
    ["Order", `${d.orderNumber} · ${d.farmName}`],
    ["Problem", `${d.reasonLabel} · ${d.items.length === 1 ? plural(d.items[0]!.quantity, d.items[0]!.unitLabel, d.items[0]!.unitLabel) : plural(units, "item")}`],
    ["Farm can reply by", dayTime(d.farmReplyBy)],
  ];
  return (
    <AuthCard width={540} top={64} padding="40px 36px" center headerRight={<OrdersLink orderId={orderId} />}>
      <span aria-hidden className="inline-flex size-[76px] items-center justify-center rounded-full bg-lime-soft text-forest">
        <ShieldCheck className="size-[34px]" strokeWidth={1.75} />
      </span>
      <h1 className="m-0 mt-[22px] font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em] m:text-2xl m:leading-[30px]">We&apos;ve got your report</h1>
      <p className="p mt-2">Your payment stays held while we look into it. We&apos;ll update you by email and in the app.</p>
      <dl className="m-0 mt-6 rounded-2xl bg-soft px-[18px] py-1.5 text-left">
        {rows.map(([k, v], i) => (
          <div key={k} className="flex justify-between gap-3 py-2.5 text-sm [&+&]:shadow-[inset_0_1px_0_#EEF0EB]">
            <dt className="text-muted-2">{k}</dt>
            <dd className={`m-0 text-right ${i === 0 ? "font-bold" : "font-semibold"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-[22px] grid grid-cols-2 gap-2.5 m:grid-cols-1">
        <ButtonLink href={status === "signed-in" ? routes.myOrders : routes.order(orderId)} variant="ghost" fullWidth className="min-h-[52px] rounded-[14px]">
          {status === "signed-in" ? "Back to orders" : "Back to order"}
        </ButtonLink>
        <ButtonLink href={routes.dispute(orderId)} variant="lime" fullWidth className="min-h-[52px] rounded-[14px]">
          Follow this case
        </ButtonLink>
      </div>
    </AuthCard>
  );
}
