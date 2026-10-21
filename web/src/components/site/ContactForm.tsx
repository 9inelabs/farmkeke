"use client";

// W-86 "Send us a message". Opens a real support ticket:
// useEnsureIdentity() (guest identity if needed), then support.open.
// From W-06 "Ask a question" (/contact?farm=&product=) it says what the
// question is about and links the ticket to the product and farm for staff.
import { useMutation, useQuery } from "convex/react";
import { CircleCheck, Send } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { api } from "@/convex/api";
import { errorCode, useEnsureIdentity } from "@/lib/auth";
import { Reveal } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { h3b } from "./ui";

export const SUPPORT_EMAIL = "support@farmkeke.com";

const TOPICS = [
  ["order", "An order"],
  ["payment", "Payment or refund"],
  ["account", "My account"],
  ["selling", "Selling on Farmkeke"],
  ["other", "Something else"],
] as const;

type Errors = Partial<Record<"name" | "phone" | "email" | "message" | "form", string>>;

/** Reads ?farm= and ?product= (render inside <Suspense>). */
export function ContactFormFromLink() {
  const params = useSearchParams();
  return <ContactForm listingId={params.get("product") ?? undefined} farmId={params.get("farm") ?? undefined} />;
}

/** "About: Fresh tomatoes from Okafor Farms" for the product the question is about. */
function useAbout(listingId: string | undefined) {
  const p = useQuery(api.storefront.product, listingId ? { id: listingId } : "skip") as
    | { name?: string; farm?: { name?: string } | null; farmName?: string }
    | null
    | undefined;
  if (!p?.name) return null;
  const farm = p.farm?.name ?? p.farmName;
  return farm ? `${p.name} from ${farm}` : p.name;
}

export function ContactForm({ listingId, farmId }: { listingId?: string; farmId?: string } = {}) {
  const ensureIdentity = useEnsureIdentity();
  const about = useAbout(listingId);
  const open = useMutation(api.support.open);
  const [values, setValues] = useState({ name: "", phone: "", email: "", topic: "order", orderNumber: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (k in errors) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  function validate(): Errors {
    const e: Errors = {};
    if (!values.name.trim()) e.name = "Enter your name.";
    const phoneDigits = values.phone.replace(/\D/g, "");
    if (values.phone.trim() && (phoneDigits.length < 10 || phoneDigits.length > 13))
      e.phone = "Enter a phone number like 0803 123 4567.";
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      e.email = "Enter an email address like name@example.com.";
    if (!values.phone.trim() && !values.email.trim()) e.email = "Add an email address or phone number so we can reply.";
    if (values.message.trim().length < 10) e.message = "Tell us a little more, so we can help (at least 10 characters).";
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = (["name", "phone", "email", "message"] as const).find((k) => e[k]);
      if (first) document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    const topic = TOPICS.find(([k]) => k === values.topic)?.[1] ?? values.topic;
    const body = [
      "Message from the website contact form",
      `Name: ${values.name.trim()}`,
      `Phone: ${values.phone.trim() || "not given"}`,
      `Email: ${values.email.trim() || "not given"}`,
      `Topic: ${topic}`,
      ...(about ? [`About: ${about}`] : []),
      `Order number: ${values.orderNumber.trim() || "not given"}`,
      "",
      values.message.trim(),
    ].join("\n");
    setSending(true);
    try {
      await ensureIdentity();
      await open({
        side: "shop",
        body,
        photoIds: [],
        ...(listingId ? { listingId } : {}),
        ...(farmId ? { farmId } : {}),
      });
      setSentTo(values.email.trim() || values.phone.trim());
    } catch (err) {
      const code = errorCode(err);
      setErrors({
        form:
          code === "RATE_LIMITED" || code === "TOO_MANY_REQUESTS"
            ? "You've sent several messages in a short time. Please wait a few minutes, then try again."
            : `We couldn't send your message. Check your internet connection and try again, or email ${SUPPORT_EMAIL}.`,
      });
    } finally {
      setSending(false);
    }
  }

  if (sentTo !== null) {
    return (
      <Reveal className="flex flex-col items-start gap-3 rounded-[20px] bg-surface p-9 shadow-[inset_0_0_0_1px_var(--color-line)] m:rounded-[18px] m:p-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-ok-bg text-ok">
          <CircleCheck aria-hidden size={28} strokeWidth={2} />
        </span>
        <h2 className={`${h3b} text-[22px] leading-[30px] m:text-lg m:leading-6`} role="status">
          Message sent
        </h2>
        <p className="m-0 text-[15px] leading-6 text-muted">
          Thanks, {values.name.trim().split(/\s+/)[0]}. We&apos;ll reply to {sentTo}, usually within a few hours, Monday to
          Saturday. We&apos;ll reply by email, and by SMS if it&apos;s about an order.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setValues({ name: "", phone: "", email: "", topic: "order", orderNumber: "", message: "" });
              setSentTo(null);
            }}
          >
            Send another message
          </Button>
          <Link href={routes.help} className="btn sm link">
            Visit help and FAQ
          </Link>
        </div>
      </Reveal>
    );
  }

  return (
    <form
      id="message"
      noValidate
      onSubmit={onSubmit}
      className="scroll-mt-6 rounded-[20px] bg-surface p-9 shadow-[inset_0_0_0_1px_var(--color-line)] m:rounded-[18px] m:p-4"
    >
      <h2 className={`${h3b} text-[22px] leading-[30px] m:text-lg m:leading-6`}>Send us a message</h2>
      {about ? (
        <p className="m-0 mt-2 text-sm text-muted">
          About: <span className="font-semibold text-ink">{about}</span>
        </p>
      ) : null}
      <p className="m-0 mt-1 text-sm leading-6 text-muted">We&apos;ll reply by email, and by SMS if it&apos;s about an order.</p>
      <div className="mt-6 grid grid-cols-2 gap-4 m:mt-4 m:grid-cols-1 m:gap-3">
        <TextField id="contact-name" label="Your name" autoComplete="name" value={values.name} onChange={set("name")} error={errors.name} />
        <TextField
          id="contact-phone"
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={set("phone")}
          error={errors.phone}
        />
      </div>
      <TextField
        id="contact-email"
        className="mt-4"
        label="Email address"
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={set("email")}
        error={errors.email}
      />
      <div className="mt-4 grid grid-cols-2 gap-4 m:mt-3 m:grid-cols-1 m:gap-3">
        <SelectField label="What is it about?" value={values.topic} onChange={set("topic")}>
          {TOPICS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Order number"
          labelNote="(if you have one)"
          placeholder="For example FK-10234"
          value={values.orderNumber}
          onChange={set("orderNumber")}
        />
      </div>
      <TextArea
        id="contact-message"
        className="mt-4"
        label="Your message"
        rows={5}
        placeholder="Tell us what happened and how we can help"
        value={values.message}
        onChange={set("message")}
        error={errors.message}
      />
      {errors.form ? (
        <p role="alert" className="m-0 mt-4 rounded-xl bg-err-bg px-4 py-3 text-sm leading-5 font-medium text-err">
          {errors.form}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <span className="text-xs leading-4 text-subtle">
          By sending, you agree to our <Link href={routes.legal("privacy")}>privacy policy</Link>.
        </span>
        <Button type="submit" loading={sending} icon={<Send aria-hidden size={18} strokeWidth={2} />} className="h-12 px-[22px] m:h-11 m:w-full">
          Send message
        </Button>
      </div>
    </form>
  );
}
