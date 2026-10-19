"use client";

// W-42b Check your email. "Resend link" unlocks after a minute.
import { useAuthActions } from "@convex-dev/auth/react";
import { Check, Mail } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthCard, authTitle } from "@/components/account/AuthLayouts";
import { resetEmail } from "@/components/account/resetEmail";
import { useHydrated } from "@/components/cart/parts";
import { Button } from "@/components/ui/Button";
import { routes } from "@/lib/routes";

const WAIT = 60;

export function CheckEmailView() {
  const hydrated = useHydrated();
  const email = hydrated ? resetEmail() : null;
  const { signIn } = useAuthActions();
  const [left, setLeft] = useState(WAIT);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const resend = async () => {
    if (!email || left > 0) return;
    setSending(true);
    setNote(null);
    try {
      await signIn("password", { flow: "reset", email, returnTo: "web" });
      setNote("We sent a new link. Use the newest email.");
      setLeft(WAIT);
    } catch {
      setNote("We couldn't send it. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthCard
      padding="40px 36px"
      center
      after={
        <p className="mt-5 text-center text-sm">
          <Link href={routes.signIn()} className="inline-flex min-h-11 items-center font-semibold">
            Back to sign in
          </Link>
        </p>
      }
    >
      <span aria-hidden className="inline-flex size-[72px] items-center justify-center rounded-[22px] bg-tint text-forest">
        <Mail className="size-8" strokeWidth={1.6} />
      </span>
      <h1 className={`${authTitle} mt-[22px]`}>Check your email</h1>
      <p className="p mt-2">
        We sent a reset link to{" "}
        <strong className="font-semibold text-ink">{email ?? "your email"}</strong>. It works for 30 minutes.
      </p>
      <ul className="m-0 mt-6 flex list-none flex-col gap-2.5 rounded-[14px] bg-soft px-[18px] py-4 text-left">
        {[
          'Look for an email from Farmkeke with the subject "Reset your password"',
          "Not there after a minute? Check your spam or promotions folder",
        ].map((t) => (
          <li key={t} className="flex gap-2.5 text-[13px] leading-[19px] text-ink-3">
            <Check aria-hidden className="mt-0.5 size-4 flex-none text-forest" strokeWidth={2} />
            {t}
          </li>
        ))}
      </ul>
      <Button
        variant="ghost"
        size="lg"
        fullWidth
        className="mt-[22px] min-h-[54px] rounded-[14px] disabled:text-[#9A9E95] disabled:opacity-100"
        disabled={left > 0 || !email}
        loading={sending}
        onClick={resend}
      >
        {left > 0 ? `Resend link in 0:${String(left).padStart(2, "0")}` : "Resend link"}
      </Button>
      {note ? (
        <p role="status" className="sm mt-2">
          {note}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-muted">
        Wrong email?{" "}
        <Link href={routes.forgotPassword} className="font-semibold">
          Change it
        </Link>
      </p>
    </AuthCard>
  );
}
