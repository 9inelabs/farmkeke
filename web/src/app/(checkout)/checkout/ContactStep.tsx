"use client";

// W-21 Checkout · Contact. Prefilled from the account or the last order on
// this device (checkout.contactDefaults). No code is sent to the phone.
import { useQuery } from "convex/react";
import { User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuote } from "@/components/cart/parts";
import { draft, looksLikeEmail, validPhone } from "@/components/checkout/draft";
import {
  CheckoutShell,
  CheckoutSkeleton,
  checkoutCard,
  checkoutH1,
  ItemsSummary,
  StepActions,
  useCheckoutGuard,
} from "@/components/checkout/Shell";
import { Button } from "@/components/ui/Button";
import { PhoneField, TextField } from "@/components/ui/Field";
import { api } from "@/convex/api";
import type { ContactDefaults } from "@/convex/returns/checkout";
import { useViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";

/** "+2348031234567" → "803 123 4567" */
function localPhone(phone: string) {
  const local = validPhone(phone);
  return local ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : phone;
}

export function ContactStep() {
  const ready = useCheckoutGuard(1);
  return ready ? <ContactForm /> : <CheckoutSkeleton />;
}

type Errors = Partial<Record<"name" | "phone" | "email", string>>;

function ContactForm() {
  const router = useRouter();
  const { status } = useViewer();
  const { quote, lines } = useQuote();
  const defaults = useQuery(api.checkout.contactDefaults, {}) as ContactDefaults | undefined;
  const [form, setForm] = useState(() => draft.get().contact);
  const [errors, setErrors] = useState<Errors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Fill only what's still empty, once the defaults arrive.
  const filled = useRef(false);
  useEffect(() => {
    if (!defaults || filled.current) return;
    filled.current = true;
    setForm((f) => ({
      name: f.name || defaults.name || "",
      phone: f.phone || (defaults.phone ? localPhone(defaults.phone) : ""),
      email: f.email || defaults.email || "",
    }));
  }, [defaults]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Enter your full name so the rider knows who to ask for.";
    if (!validPhone(form.phone))
      next.phone = form.phone.trim()
        ? "That doesn't look like a Nigerian mobile number. Check it and try again, e.g. 803 123 4567."
        : "Enter your phone number so the farm and rider can reach you.";
    if (form.email.trim() && !looksLikeEmail(form.email)) next.email = "Check the email address, e.g. name@example.com.";
    setErrors(next);
    const first = next.name ? nameRef : next.phone ? phoneRef : next.email ? emailRef : null;
    if (first) {
      first.current?.focus();
      return;
    }
    draft.patch({ contact: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() } });
    router.push(routes.checkoutDelivery);
  };

  return (
    <CheckoutShell step={1} aside={<ItemsSummary lines={lines} quote={quote} />}>
      <section className={`${checkoutCard} p-8 m:p-5`}>
        <h1 className={checkoutH1}>Your contact details</h1>
        <p className="p mt-1.5">So the farm and our rider can reach you about this order.</p>
        {status === "signed-in" ? null : (
          <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-xl bg-soft px-3.5 py-3 text-sm">
            <User aria-hidden className="size-[18px] flex-none text-forest" strokeWidth={1.75} />
            <span className="flex-1 text-ink-3">Have an account?</span>
            <Link href={routes.signIn(routes.checkout)} className="inline-flex min-h-11 items-center font-semibold">
              Sign in for faster checkout
            </Link>
          </div>
        )}
        <form id="contact-form" noValidate onSubmit={submit} className="mt-6 flex flex-col gap-[18px]">
          <TextField
            ref={nameRef}
            label="Full name"
            autoComplete="name"
            placeholder="Adaeze Nwankwo"
            value={form.name}
            onChange={set("name")}
            error={errors.name}
          />
          <PhoneField
            ref={phoneRef}
            label="Phone number"
            placeholder="803 123 4567"
            value={form.phone}
            onChange={set("phone")}
            hint="We'll send order updates to this number. No code needed."
            error={errors.phone}
          />
          <TextField
            ref={emailRef}
            label="Email"
            labelNote="(optional)"
            type="email"
            autoComplete="email"
            placeholder="adaeze@example.com"
            value={form.email}
            onChange={set("email")}
            hint="Add it to get your receipt and order updates by email."
            error={errors.email}
          />
        </form>
        <StepActions back={routes.cart}>
          <Button type="submit" form="contact-form" variant="lime" size="lg" className="min-h-[54px] min-w-[220px] px-6 m:min-w-0">
            Continue
          </Button>
        </StepActions>
        {status === "signed-in" ? null : (
          <p className="cap mt-4">
            Your order is remembered on this device. Only this device can confirm delivery, unless you save an account
            after ordering.
          </p>
        )}
      </section>
    </CheckoutShell>
  );
}
