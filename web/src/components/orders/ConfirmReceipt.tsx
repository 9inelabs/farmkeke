"use client";

// W-52 Confirm receipt. "Did everything arrive?": the shopper ticks each item,
// then orders.consumer.confirmReceipt completes the order and releases the
// money to the farm (W-52b). Anything wrong goes to Report a problem (W-53).
import { useMutation, useQuery } from "convex/react";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { capitalise, Thumb } from "@/components/cart/parts";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, type Id } from "@/convex/api";
import type { OrderDetail } from "@/convex/returns/orders";
import { errorCode } from "@/lib/auth";
import { naira } from "@/lib/format";
import { routes } from "@/lib/routes";

export function ConfirmReceiptModal({
  orderId,
  open,
  onClose,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
}) {
  const order = useQuery(api.orders.consumer.get, open ? { orderId } : "skip") as OrderDetail | null | undefined;
  return (
    <Modal
      open={open}
      onClose={onClose}
      width={540}
      title={
        <>
          {order ? (
            <span className="mb-1.5 block font-sans text-[13px] font-semibold tracking-normal text-[#4C7A1F]">
              {order.number} · {order.farmName}
            </span>
          ) : null}
          Did everything arrive?
        </>
      }
      titleClassName="m-0 font-display text-2xl leading-8 font-extrabold m:text-xl m:leading-7"
      headerClassName="flex items-start justify-between gap-4 px-8 pt-8 m:px-5 m:pt-6"
      bodyClassName="px-8 pb-8 m:px-5 m:pb-6"
    >
      {order === undefined ? (
        <div className="flex flex-col gap-2.5 pt-2">
          <Skeleton className="h-[74px] w-full" rounded={14} />
          <Skeleton className="h-[74px] w-full" rounded={14} />
        </div>
      ) : order === null ? (
        <p className="p mt-2">
          We couldn&apos;t open this order. Only the account or device that placed it can confirm delivery.
        </p>
      ) : (
        <Checklist order={order} />
      )}
    </Modal>
  );
}

function Checklist({ order }: { order: OrderDetail }) {
  const router = useRouter();
  const confirm = useMutation(api.orders.consumer.confirmReceipt);
  const [ticked, setTicked] = useState<boolean[]>(() => order.items.map(() => true));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const all = ticked.every(Boolean);

  const submit = async () => {
    if (!all || busy) return;
    setBusy(true);
    setError(null);
    try {
      await confirm({ orderId: order._id as Id<"orders"> });
      router.push(routes.orderReleased(order._id));
    } catch (e) {
      setBusy(false);
      const code = errorCode(e);
      setError(
        code === "NOT_DELIVERED_YET"
          ? "This order hasn't been marked delivered yet. You can confirm once it arrives."
          : code === "NOT_FOUND"
            ? "Only the account or device that placed this order can confirm it."
            : "We couldn't confirm right now. Check your connection and try again.",
      );
    }
  };

  return (
    <>
      <p className="mt-1.5 text-[15px] leading-[23px] text-muted">Tick each item you received in good condition.</p>
      <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0">
        {order.items.map((it, i) => (
          <li key={it.index}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[14px] px-4 py-3.5 shadow-[inset_0_0_0_1px_#DCE0D6]">
              <input
                type="checkbox"
                checked={ticked[i]}
                onChange={(e) => setTicked((t) => t.map((v, j) => (j === i ? e.target.checked : v)))}
                className="size-5 flex-none accent-forest"
              />
              <Thumb id={it.listingId} imageUrl={it.imageUrl} size={44} radius={10} />
              <span className="flex-1">
                <span className="block text-[15px] font-semibold">{it.name}</span>
                <span className="block text-xs text-subtle">
                  {capitalise(it.unitSingular)} × {it.quantity}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-[18px] flex gap-2.5 rounded-[14px] bg-[#F4F7EE] px-4 py-3.5 text-[13px] leading-[19px] text-[#2E3A28]">
        <ShieldCheck aria-hidden className="size-[18px] flex-none text-forest" strokeWidth={1.75} />
        <span>
          When you confirm, <strong className="font-semibold">{naira(order.totalKobo)}</strong> is released to{" "}
          {order.farmName}. You can&apos;t undo this, so report any problem first.
        </span>
      </div>
      {!all ? (
        <p role="status" className="field-error">
          Something missing or damaged? Choose &quot;There&apos;s a problem&quot; instead, and we&apos;ll help.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
      <div className="mt-[22px] grid grid-cols-2 gap-2.5 m:grid-cols-1">
        <ButtonLink href={routes.reportProblem(order._id)} variant="ghost" fullWidth className="min-h-[52px] rounded-[14px]">
          There&apos;s a problem
        </ButtonLink>
        <Button variant="lime" fullWidth className="min-h-[52px] rounded-[14px]" loading={busy} disabled={!all} onClick={submit}>
          Confirm and release
        </Button>
      </div>
    </>
  );
}
