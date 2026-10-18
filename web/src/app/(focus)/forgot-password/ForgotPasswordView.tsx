"use client";

// W-42a Forgot password. Asks Convex Auth to email a reset link (flow "reset").
// Unknown emails get the same "check your email" result, so the form can't be
// used to find out who has an account.
import { useAuthActions } from "@convex-dev/auth/react";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { AuthCard, authTitle, BackLink } from "@/components/account/AuthLayouts";
import { resetEmail, setResetEmail } from "@/components/account/resetEmail";
import { useHydrated } from "@/components/cart/parts";
import { looksLikeEmail } from "@/components/checkout/draft";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";

export function ForgotPasswordView() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { viewer } = useViewer();
  const hydrated = useHydrated();
  // null until the person types: show the email used last time, or the account's.
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const value = email ?? ((hydrated ? resetEmail() : null) || viewer?.email || "");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!looksLikeEmail(value)) {
      setError("Enter the email on your account, e.g. name@example.com.");
      ref.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { flow: "reset", email: value.trim() });
      setResetEmail(value.trim());
      router.push(routes.checkEmail);
    } catch {
      setBusy(false);
      setError("We couldn't send the link. Check your connection and try again.");
    }
  };

  return (
    <AuthCard before={<BackLink href={routes.signIn()}>Back to sign in</BackLink>}>
      <span aria-hidden className="flex size-14 items-center justify-center rounded-2xl bg-tint text-forest">
        <KeyRound className="size-[26px]" strokeWidth={1.75} />
      </span>
      <h1 className={`${authTitle} mt-5`}>Forgot your password?</h1>
      <p className="p mt-2">Enter the email on your account and we&apos;ll send you a link to create a new one.</p>
      <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-[18px]">
        <TextField
          ref={ref}
          label="Email"
          type="email"
          autoComplete="email"
          value={value}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          error={error}
        />
        <Button type="submit" variant="lime" size="lg" fullWidth loading={busy} className="min-h-[54px] rounded-[14px]">
          Send reset link
        </Button>
      </form>
      <p className="mt-[18px] text-[13px] leading-[19px] text-subtle">
        No longer have access to that email?{" "}
        <Link href={routes.contact} className="font-semibold">
          Contact support
        </Link>
      </p>
    </AuthCard>
  );
}
