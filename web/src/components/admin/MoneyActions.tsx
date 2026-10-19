"use client";

// Release an order's held money to the farm, or put it on hold (A-62).
// Used on the release queue, the escrow ledger and the order page.
import { useMutation } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import { naira } from "@/lib/format";
import { useStaff } from "./context";
import { ReasonDialog } from "./ui";

export function MoneyActions({
  order,
  onDone,
}: {
  order: { orderId: Id<"orders">; number: string; status: string; escrow: string; escrowHold: boolean; amountKobo: number };
  onDone?: (message: string) => void;
}) {
  const me = useStaff();
  const release = useMutation(admin.ledger.release);
  const setHold = useMutation(admin.ledger.setHold);
  const [dialog, setDialog] = useState<"release" | "hold" | null>(null);
  if (!me.can("money.manage") || order.escrow !== "held") return null;
  const releasable = !order.escrowHold && ["delivered", "collected", "completed"].includes(order.status);
  return (
    <>
      <span className="flex flex-wrap gap-2">
        {releasable ? (
          <Button size="sm" variant="lime" onClick={() => setDialog("release")}>
            Release
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => setDialog("hold")}>
          {order.escrowHold ? "Lift hold" : "Hold"}
        </Button>
      </span>
      <ReasonDialog
        open={dialog === "release"}
        onClose={() => setDialog(null)}
        title={`Release ${order.number}`}
        description={`Pays the farm for the products, minus Farmkeke's commission. Use it after checking with the shopper. Order total ${naira(order.amountKobo)}.`}
        confirmLabel="Release to the farm"
        variant="lime"
        onConfirm={async (reason) => {
          await release({ orderId: order.orderId, reason });
          onDone?.(`${order.number} released to the farm.`);
        }}
      />
      <ReasonDialog
        open={dialog === "hold"}
        onClose={() => setDialog(null)}
        title={order.escrowHold ? `Lift the hold on ${order.number}` : `Hold ${order.number}`}
        description={
          order.escrowHold
            ? order.status === "completed"
              ? "The shopper already confirmed, so the farm is paid straight away."
              : "The money goes back to the normal flow."
            : "Freezes the money: it can't be released or refunded until the hold is lifted."
        }
        confirmLabel={order.escrowHold ? "Lift hold" : "Hold the money"}
        variant={order.escrowHold ? "dark" : "danger"}
        onConfirm={async (reason) => {
          await setHold({ orderId: order.orderId, hold: !order.escrowHold, reason });
          onDone?.(order.escrowHold ? "Hold lifted." : "Money on hold.");
        }}
      />
    </>
  );
}
