"use client";

// W-50 Find my order: order number + phone (orders.consumer.find). On another
// device the order opens view-only (W-51c); on the device that placed it, in full.
import { useConvex } from "convex/react";
import { Info, Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { validPhone } from "@/components/checkout/draft";
import { rememberLookup } from "@/components/orders/lookup";
import { Button } from "@/components/ui/Button";
import { PhoneField, TextField } from "@/components/ui/Field";
import { api } from "@/convex/api";
import type { OrderDetail } from "@/convex/returns/orders";
import { Reveal } from "@/lib/motion";
import { routes } from "@/lib/routes";

type Errors = Partial<Record<"number" | "phone" | "form", string>>;

export function FindOrderView() {
  const convex = useConvex();
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const numRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n: Errors = {};
    if (!number.trim()) n.number = "Enter your order number, e.g. FK-10234.";
    const local = validPhone(phone);
    if (!local) n.phone = "Enter the phone number you used when ordering, e.g. 803 123 4567.";
    setErrors(n);
    if (n.number) return numRef.current?.focus();
    if (n.phone) return phoneRef.current?.focus();
    setBusy(true);
    try {
      const order = (await convex.query(api.orders.consumer.find, { number: number.trim(), phone: `+234${local}` })) as OrderDetail | null;
      if (!order) {
        setBusy(false);
        setErrors({ form: "We couldn't find an order with that number and phone number. Check both and try again." });
        return;
      }
      rememberLookup({ orderId: order._id, number: order.number, phone: `+234${local}` });
      router.push(routes.order(order._id));
    } catch {
      setBusy(false);
      setErrors({ form: "We couldn't look that up. Check your connection and try again." });
    }
  };

  return (
    <div className="mx-auto max-w-[500px] px-5 pt-16 pb-24 m:pt-8">
      <Reveal>
        <section className="rounded-[24px] bg-surface p-9 shadow-[inset_0_0_0_1px_var(--color-line)] m:px-5 m:py-8">
          <span aria-hidden className="flex size-14 items-center justify-center rounded-2xl bg-tint text-forest">
            <Package className="size-[26px]" strokeWidth={1.75} />
          </span>
          <h1 className="m-0 mt-5 font-display text-[26px] leading-[34px] font-extrabold tracking-[-0.02em]">Find my order</h1>
          <p className="p mt-2">Ordered as a guest? Look up your order with the order number and the phone number you used.</p>
          <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-[18px]">
            <TextField
              ref={numRef}
              label="Order number"
              placeholder="FK-10234"
              autoCapitalize="characters"
              value={number}
              onChange={(e) => {
                setNumber(e.target.value.toUpperCase());
                setErrors({});
              }}
              hint="It's in the SMS and email we sent when you ordered."
              error={errors.number}
            />
            <PhoneField
              ref={phoneRef}
              label="Phone number"
              placeholder="803 123 4567"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors({});
              }}
              error={errors.phone}
            />
            {errors.form ? (
              <p role="alert" className="field-error m-0">
                {errors.form}
              </p>
            ) : null}
            <Button type="submit" variant="lime" size="lg" fullWidth loading={busy} className="min-h-[54px] rounded-[14px]">
              Find order
            </Button>
          </form>
          <div className="mt-[22px] flex gap-2.5 rounded-xl bg-soft px-4 py-3.5 text-[13px] leading-[19px] text-ink-3">
            <Info aria-hidden className="size-[18px] flex-none text-forest" strokeWidth={1.75} />
            <span>
              On this device you can view the order. To confirm delivery, use the phone or browser you ordered on, or{" "}
              <Link href={routes.signUp()} className="font-semibold">
                create an account
              </Link>
              .
            </span>
          </div>
        </section>
        <p className="mt-5 text-center text-sm text-muted">
          Have an account?{" "}
          <Link href={routes.signIn(routes.myOrders)} className="font-semibold">
            Sign in to see all your orders
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
