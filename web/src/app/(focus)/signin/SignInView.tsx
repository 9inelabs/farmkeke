"use client";

// W-40 Sign in. Password sign-in (email, or a farmer's phone number). A guest
// with orders on this browser has them moved into the account straight after
// (startGuestClaim before, claimGuestOrders after).
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { Sprout } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AuthSplit, safeNext } from "@/components/account/AuthLayouts";
import { claimPendingGuestOrders, forgetClaimSnapshot } from "@/components/account/claim";
import { rememberSignIn } from "@/components/account/SessionKeeper";
import { usePrepareGuestClaim } from "@/components/account/useGuestClaim";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { api } from "@/convex/api";
import { errorCode, errorData, useViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";

export function SignInView({ next }: { next?: string | null }) {
  if (next === null) return <Form next={undefined} />;
  return <WithParams />;
}

function WithParams() {
  const params = useSearchParams();
  return <Form next={safeNext(params.get("next"))} />;
}

type Errors = Partial<Record<"identifier" | "password" | "form", string>>;

function messageFor(e: unknown): Errors {
  switch (errorCode(e)) {
    case "INVALID_CREDENTIALS": {
      const left = errorData<{ attemptsLeft?: number }>(e)?.attemptsLeft;
      return {
        password:
          left !== undefined && left <= 3
            ? `That email and password don't match. You have ${left} ${left === 1 ? "try" : "tries"} left before we pause sign-in for a while.`
            : "That email and password don't match. Check them and try again.",
      };
    }
    case "TOO_MANY_ATTEMPTS":
      return { form: "Too many tries. Wait 15 minutes, or reset your password to get back in now." };
    case "BLOCKED":
      return { form: "This account is paused. Contact support and we'll help." };
    default:
      return { form: "We couldn't sign you in. Check your connection and try again." };
  }
}

function Form({ next }: { next: string | undefined }) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { status } = useViewer();
  const claim = useMutation(api.orders.consumer.claimGuestOrders);
  const prepareClaim = usePrepareGuestClaim();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [keep, setKeep] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const idRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const target = next ?? routes.account;

  // Already signed in: go straight on.
  useEffect(() => {
    if (status === "signed-in" && !submitting.current) router.replace(target);
  }, [status, router, target]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!identifier.trim()) next.identifier = "Enter the email on your account.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (next.identifier) return idRef.current?.focus();
    if (next.password) return pwRef.current?.focus();
    setBusy(true);
    submitting.current = true;
    try {
      await prepareClaim();
      await signIn("password", { flow: "signIn", identifier: identifier.trim(), password });
      rememberSignIn(keep);
      await claimPendingGuestOrders(claim);
      forgetClaimSnapshot();
      router.replace(target);
    } catch (err) {
      submitting.current = false;
      setBusy(false);
      const m = messageFor(err);
      setErrors(m);
      if (m.password) pwRef.current?.focus();
    }
  };

  return (
    <AuthSplit side="signin">
      <h1 className="m-0 font-display text-[30px] leading-[38px] font-extrabold tracking-[-0.02em]">Welcome back</h1>
      <p className="p mt-1.5">Sign in to track orders and check out faster.</p>
      <form noValidate onSubmit={submit} className="mt-7 flex flex-col gap-[18px]">
        <TextField
          ref={idRef}
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="adaeze@example.com"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            setErrors({});
          }}
          error={errors.identifier}
        />
        <div className="relative">
          <PasswordField
            ref={pwRef}
            label="Password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors({});
            }}
            error={errors.password}
          />
          <Link
            href={routes.forgotPassword}
            className="absolute -top-3 right-0 inline-flex min-h-11 items-center text-[13px] font-semibold"
          >
            Forgot password?
          </Link>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={keep}
            onChange={(e) => setKeep(e.target.checked)}
            className="m-0 size-[18px] accent-forest"
          />
          Keep me signed in
        </label>
        {errors.form ? (
          <p role="alert" className="field-error m-0">
            {errors.form}{" "}
            {errors.form.startsWith("Too many") ? (
              <Link href={routes.forgotPassword} className="font-semibold text-err underline">
                Reset your password
              </Link>
            ) : errors.form.includes("support") ? (
              <Link href={routes.contact} className="font-semibold text-err underline">
                Contact support
              </Link>
            ) : null}
          </p>
        ) : null}
        <Button type="submit" variant="lime" size="lg" fullWidth loading={busy} className="mt-1 min-h-[54px] rounded-[14px] px-[22px]">
          Sign in
        </Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-[#9A9E95]">
        <span aria-hidden className="h-px flex-1 bg-line-soft" />
        New to Farmkeke?
        <span aria-hidden className="h-px flex-1 bg-line-soft" />
      </div>
      <ButtonLink href={routes.signUp(next)} variant="ghost" size="lg" fullWidth className="min-h-[54px] rounded-[14px]">
        Create an account
      </ButtonLink>
      <p className="mt-5 text-center text-xs leading-[17px] text-subtle">
        Just want to buy?{" "}
        <Link href={routes.shop} className="font-semibold">
          Continue as a guest
        </Link>
      </p>
      <div className="mt-7 flex gap-2.5 rounded-xl bg-soft px-4 py-3.5 text-[13px] leading-[19px] text-ink-3">
        <Sprout aria-hidden className="size-[18px] flex-none text-forest" strokeWidth={1.75} />
        <span>
          Selling on Farmkeke? Farmers sign in and manage their farm in the{" "}
          <Link href={routes.getTheApp} className="font-semibold">
            Farmkeke app
          </Link>
          .
        </span>
      </div>
    </AuthSplit>
  );
}
