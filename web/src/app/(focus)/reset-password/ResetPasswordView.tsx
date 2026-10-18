"use client";

// W-42c Create new password, from the emailed link (?email=…&code=…).
// flow "reset-verification" checks the one-time code, saves the password and
// signs out other devices. A wrong, used or expired link goes to W-42e.
import { useAuthActions } from "@convex-dev/auth/react";
import { Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { AuthCard, authTitle, PasswordRules, strongPassword } from "@/components/account/AuthLayouts";
import { forgetShortSession } from "@/components/account/SessionKeeper";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/Field";
import { errorCode } from "@/lib/auth";
import { routes } from "@/lib/routes";

/** email/code null: the prerendered fallback, before the link's ?email=&code= are read. */
export function ResetPasswordView({ email }: { email?: string | null; code?: string | null }) {
  if (email === null) return <Form email="" code="" />;
  return <WithParams />;
}

function WithParams() {
  const params = useSearchParams();
  return <Form email={params.get("email") ?? ""} code={params.get("code") ?? ""} />;
}

function Form({ email, code }: { email: string; code: string }) {
  const router = useRouter();
  const { signIn, signOut } = useAuthActions();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"password" | "confirm" | "form", string>>>({});
  const [busy, setBusy] = useState(false);
  const pwRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const matches = confirm.length > 0 && confirm === password;
  const missingLink = !email || !code;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (missingLink) return router.replace(routes.linkExpired);
    const n: typeof errors = {};
    if (!strongPassword(password)) n.password = "Your password needs 8 or more characters, a letter and a number.";
    else if (confirm !== password) n.confirm = "The passwords don't match. Type the new password again.";
    setErrors(n);
    if (n.password) return pwRef.current?.focus();
    if (n.confirm) return confirmRef.current?.focus();
    setBusy(true);
    try {
      await signIn("password", { flow: "reset-verification", email, code, newPassword: password });
      // The reset signs this browser in; W-42d asks to sign in with the new
      // password, so start fresh.
      await signOut().catch(() => undefined);
      forgetShortSession();
      router.replace(routes.passwordChanged);
    } catch (err) {
      setBusy(false);
      const c = errorCode(err);
      if (c === "INVALID_CODE") return router.replace(routes.linkExpired);
      setErrors(
        c === "WEAK_PASSWORD"
          ? { password: "Your password needs 8 or more characters, a letter and a number." }
          : { form: "We couldn't save your new password. Check your connection and try again." },
      );
    }
  };

  return (
    <AuthCard>
      <h1 className={authTitle}>Create a new password</h1>
      <p className="p mt-2">
        {email ? `For ${email}. ` : ""}Choose one you haven&apos;t used on Farmkeke before.
      </p>
      <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-[18px]">
        <div>
          <PasswordField
            ref={pwRef}
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors({});
            }}
            error={errors.password}
            {...(errors.password ? {} : { "aria-describedby": "new-pw-rules" })}
          />
          <PasswordRules password={password} id="new-pw-rules" />
        </div>
        <div>
          <PasswordField
            ref={confirmRef}
            label="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setErrors({});
            }}
            error={errors.confirm}
          />
          {matches && !errors.confirm ? (
            <span className="mt-2 flex items-center gap-1.5 text-xs text-ok" role="status">
              <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
              Passwords match
            </span>
          ) : null}
        </div>
        {errors.form ? (
          <p role="alert" className="field-error m-0">
            {errors.form}
          </p>
        ) : null}
        <Button type="submit" variant="lime" size="lg" fullWidth loading={busy} className="min-h-[54px] rounded-[14px]">
          Save new password
        </Button>
      </form>
      <p className="mt-4 text-[13px] leading-[19px] text-subtle">
        You&apos;ll be signed out on other devices. The Farmkeke app uses this same password.
      </p>
    </AuthCard>
  );
}
