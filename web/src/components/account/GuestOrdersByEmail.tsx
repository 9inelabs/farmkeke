"use client";

// W-42 / W-44: guest orders placed on another device with this account's
// email (orders.consumer.linkableGuestOrders). Only a count is shown until the
// email is proved: "Add them to my account" (linkGuestOrdersByEmail) adds them
// straight away when the email is already verified, otherwise it emails a
// one-time link to that address (opened on /account/orders?link=…). Orders are
// never matched by phone number. Same card as W-42's "We found 2 earlier orders".
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/convex/api";
import { plural } from "@/lib/format";
import { routes } from "@/lib/routes";

type Linkable = { count: number; email: string | null; verified: boolean };

export function GuestOrdersByEmail({ className = "" }: { className?: string }) {
  const router = useRouter();
  const linkable = useQuery(api.orders.consumer.linkableGuestOrders, {}) as Linkable | undefined;
  const link = useMutation(api.orders.consumer.linkGuestOrdersByEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!linkable || linkable.count === 0 || !linkable.email) return null;

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = (await link({})) as { status: "linked" | "email_sent" | "none" };
      if (r.status === "email_sent") setSent(true);
      else router.push(routes.myOrders);
    } catch {
      setError("We couldn't add them. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl bg-[#F7FAF1] px-5 py-[18px] text-left shadow-[inset_0_0_0_1px_#DCE9C3] ${className}`}>
      <div className="text-[15px] font-bold">We found {plural(linkable.count, "earlier order")}</div>
      <div className="mt-0.5 text-[13px] text-muted">Placed as a guest with {linkable.email}</div>
      {sent ? (
        <p role="status" className="m-0 mt-3 text-sm text-ink">
          We&apos;ve sent a link to <span className="font-semibold">{linkable.email}</span>. Open it on this browser to add{" "}
          {linkable.count === 1 ? "it" : "them"} to your account.
        </p>
      ) : (
        <Button variant="lime" fullWidth loading={busy} onClick={add} className="mt-3 min-h-11">
          Add them to my account
        </Button>
      )}
      {error ? (
        <p role="alert" className="field-error text-center">
          {error}
        </p>
      ) : null}
      <p className="mt-2.5 text-center text-xs leading-[17px] text-subtle">
        Once added, you can confirm delivery from any device you&apos;re signed in on.
      </p>
    </div>
  );
}
