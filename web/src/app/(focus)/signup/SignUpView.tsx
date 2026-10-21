"use client";

// W-41 Create account. A guest with orders on this browser starts a claim
// first, so W-42 can offer to add those orders to the new account.
import { useAuthActions } from "@convex-dev/auth/react";
import { Package } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AuthSplit, PasswordRules, safeNext, strongPassword } from "@/components/account/AuthLayouts";
import { setAfterSignup } from "@/components/account/afterSignup";
import { forgetShortSession } from "@/components/account/SessionKeeper";
import { usePrepareGuestClaim } from "@/components/account/useGuestClaim";
import { looksLikeEmail } from "@/components/checkout/draft";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { errorCode, useViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";

export function SignUpView({ next }: { next?: string | null }) {
  if (next === null) return <Form next={undefined} />;
  return <WithParams />;
}

function WithParams() {
  const params = useSearchParams();
  return <Form next={safeNext(params.get("next"))} />;
}

type Errors = Partial<Record<"name" | "email" | "password" | "terms" | "form", React.ReactNode>>;

function Form({ next }: { next: string | undefined }) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { status } = useViewer();
  const prepareClaim = usePrepareGuestClaim();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "signed-in" && !submitting.current) router.replace(next ?? routes.account);
  }, [status, router, next]);

  const clear = (k: keyof Errors) => setErrors((x) => ({ ...x, [k]: undefined, form: undefined }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n: Errors = {};
    if (!name.trim()) n.name = "Enter your full name.";
    if (!looksLikeEmail(email)) n.email = "Enter your email address, e.g. name@example.com.";
    if (!strongPassword(password)) n.password = "Your password needs 8 or more characters, a letter and a number.";
    if (!terms) n.terms = "Please agree to the Terms of use and Privacy policy to continue.";
    setErrors(n);
    const first = n.name ? nameRef : n.email ? emailRef : n.password ? pwRef : n.terms ? termsRef : null;
    if (first) return first.current?.focus();
    setBusy(true);
    submitting.current = true;
    try {
      await prepareClaim();
      await signIn("password", { flow: "signUp", name: name.trim(), email: email.trim(), password });
      forgetShortSession();
      setAfterSignup(next ?? null, name.trim());
      router.replace(routes.accountCreated);
    } catch (err) {
      submitting.current = false;
      setBusy(false);
      const code = errorCode(err);
      if (code === "EMAIL_TAKEN") {
        setErrors({
          email: (
            <>
              There&apos;s already an account with this email.{" "}
              <Link href={routes.signIn(next)} className="font-semibold text-err underline">
                Sign in instead
              </Link>
            </>
          ),
        });
        emailRef.current?.focus();
      } else if (code === "INVALID_EMAIL") setErrors({ email: "Check the email address, e.g. name@example.com." });
      else if (code === "WEAK_PASSWORD") setErrors({ password: "Your password needs 8 or more characters, a letter and a number." });
      else if (code === "NAME_REQUIRED") setErrors({ name: "Enter your full name." });
      else setErrors({ form: "We couldn't create your account. Check your connection and try again." });
    }
  };

  return (
    <AuthSplit side="signup">
      <h1 className="m-0 font-display text-[30px] leading-[38px] font-extrabold tracking-[-0.02em] m:text-[26px] m:leading-8">Create your account</h1>
      <p className="p mt-1.5">Save your addresses, follow orders from any device and check out in seconds.</p>
      <form noValidate onSubmit={submit} className="mt-[26px] flex flex-col gap-[18px]">
        <TextField
          ref={nameRef}
          label="Full name"
          autoComplete="name"
          placeholder="Adaeze Nwankwo"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clear("name");
          }}
          error={errors.name}
        />
        <TextField
          ref={emailRef}
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="adaeze@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clear("email");
          }}
          error={errors.email}
        />
        <div>
          <PasswordField
            ref={pwRef}
            label="Password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clear("password");
            }}
            error={errors.password}
            {...(errors.password ? {} : { "aria-describedby": "pw-rules" })}
          />
          <PasswordRules password={password} id="pw-rules" />
        </div>
        <div>
          <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-[13px] leading-[19px] text-ink-3">
            <input
              ref={termsRef}
              type="checkbox"
              checked={terms}
              onChange={(e) => {
                setTerms(e.target.checked);
                clear("terms");
              }}
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? "terms-error" : undefined}
              className="m-0 mt-px size-[18px] flex-none accent-forest"
            />
            <span>
              I agree to the{" "}
              <Link href={routes.legal("terms")} className="font-semibold">
                Terms of use
              </Link>{" "}
              and{" "}
              <Link href={routes.legal("privacy")} className="font-semibold">
                Privacy policy
              </Link>
            </span>
          </label>
          {errors.terms ? (
            <span id="terms-error" role="alert" className="field-error">
              {errors.terms}
            </span>
          ) : null}
        </div>
        {errors.form ? (
          <p role="alert" className="field-error m-0">
            {errors.form}
          </p>
        ) : null}
        <Button type="submit" variant="lime" size="lg" fullWidth loading={busy} className="mt-0.5 min-h-[54px] rounded-[14px] px-[22px]">
          Create account
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-subtle">
        Already have an account?{" "}
        <Link href={routes.signIn(next)} className="font-semibold">
          Sign in
        </Link>
      </p>
      <div className="mt-6 flex gap-2.5 rounded-xl bg-soft px-4 py-3.5 text-[13px] leading-[19px] text-ink-3">
        <Package aria-hidden className="size-[18px] flex-none text-forest" strokeWidth={1.75} />
        <span>Ordered as a guest before? We&apos;ll find orders made with this email and offer to add them to your account.</span>
      </div>
    </AuthSplit>
  );
}
