"use client";

// A-01 / A-02 Admin Portal sign-in, staff application, forgot password and
// set password. Sign-in is email + password, then a 6-digit code we email.
// Flows: convex/lib/staffAuth.ts.
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { Check, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { AuthCard, authTitle } from "@/components/account/AuthLayouts";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PasswordField, PhoneField, TextArea, TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import { errorCode } from "@/lib/auth";
import type { AdminMe } from "@/convex/returns/admin";
import { adminError } from "./errors";
import { adminRoutes, safeAdminNext } from "./routes";
import { Notice } from "./ui";

const PortalLabel = () => <span className="badge b-held">Admin portal</span>;

function Card({ children, width = 480 }: { children: ReactNode; width?: number }) {
  return (
    <AuthCard width={width} headerRight={<PortalLabel />}>
      {children}
    </AuthCard>
  );
}

export function staffPasswordChecks(password: string) {
  return [
    { label: "10 or more characters", ok: password.length >= 10 },
    { label: "A letter", ok: /[a-zA-Z]/.test(password) },
    { label: "A number", ok: /\d/.test(password) },
  ];
}

function StaffPasswordRules({ password, id }: { password: string; id: string }) {
  return (
    <span id={id} className="mt-2.5 flex flex-wrap gap-3.5">
      {staffPasswordChecks(password).map((c) => (
        <span key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? "text-ok" : "text-subtle"}`}>
          {c.ok ? (
            <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
          ) : (
            <span aria-hidden className="size-3.5 rounded-full shadow-[inset_0_0_0_1.5px_#B9BEB1]" />
          )}
          {c.label}
          <span className="sr-only">{c.ok ? " (done)" : " (needed)"}</span>
        </span>
      ))}
    </span>
  );
}

/** Step 2 of sign-in and of applying: the emailed 6-digit code. */
function CodeStep({
  email,
  purpose,
  resend,
  onBack,
  onDone,
}: {
  email: string;
  purpose: "signin" | "confirm";
  resend: () => Promise<void>;
  onBack: () => void;
  onDone: () => void;
}) {
  const { signIn } = useAuthActions();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/\D/g, "");
    if (clean.length !== 6) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { flow: "staffCode", email, code: clean });
      onDone();
    } catch (err) {
      setError(adminError(err));
      setBusy(false);
    }
  };

  return (
    <>
      <span className="tile mb-5" aria-hidden>
        <MailCheck className="size-6" strokeWidth={1.75} />
      </span>
      <h1 className={authTitle}>{purpose === "confirm" ? "Confirm your email" : "Check your email"}</h1>
      <p className="p mt-2">
        We sent a 6-digit code to <strong className="text-ink">{email}</strong>.{" "}
        {purpose === "confirm" ? "Enter it to send your application." : "Enter it to finish signing in."} It works for 10 minutes.
      </p>
      <form className="mt-6 flex flex-col gap-4" onSubmit={submit} noValidate>
        <TextField
          label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, "").slice(0, 7))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={7}
          className="[&_input]:text-center [&_input]:font-display [&_input]:text-[24px] [&_input]:tracking-[0.3em]"
          error={error ?? undefined}
          autoFocus
        />
        <Button type="submit" variant="lime" size="lg" fullWidth loading={busy}>
          {purpose === "confirm" ? "Confirm and send application" : "Sign in"}
        </Button>
      </form>
      {sent ? (
        <div className="mt-4">
          <Notice tone="ok">{sent}</Notice>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" onClick={onBack} className="min-h-11 cursor-pointer font-semibold text-forest">
          Use a different email
        </button>
        <button
          type="button"
          className="min-h-11 cursor-pointer font-semibold text-forest"
          onClick={async () => {
            setError(null);
            setSent(null);
            try {
              await resend();
              setSent("We sent a new code. Use the newest email.");
            } catch (err) {
              setError(adminError(err));
            }
          }}
        >
          Send a new code
        </button>
      </div>
    </>
  );
}

function useNext() {
  const params = useSearchParams();
  return safeAdminNext(params.get("next"));
}

export function SignInForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const params = useSearchParams();
  const next = useNext();
  const { isLoading } = useConvexAuth();
  const me = useQuery(admin.access.me, isLoading ? "skip" : {}) as AdminMe | undefined;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"password" | "code">("password");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  // Already signed in and verified: straight in. Session expired: keep the email.
  useEffect(() => {
    if (me?.state === "staff") router.replace(next);
  }, [me, next, router]);
  if (!prefilled && me && me.state === "verify") {
    setPrefilled(true);
    setEmail(me.email);
  }

  const send = async () => {
    await signIn("password", { flow: "staffSignIn", email: email.trim(), password });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await send();
      setStep("code");
    } catch (err) {
      setError(adminError(err));
    } finally {
      setBusy(false);
    }
  };

  if (step === "code") {
    return (
      <Card>
        <CodeStep
          email={email.trim().toLowerCase()}
          purpose="signin"
          resend={send}
          onBack={() => {
            setStep("password");
            setPassword("");
          }}
          onDone={() => router.replace(next)}
        />
      </Card>
    );
  }

  const reason = params.get("reason");
  return (
    <Card>
      <h1 className={authTitle}>Sign in to the admin portal</h1>
      <p className="p mt-2">For Farmkeke staff. After your password, we email you a code to finish signing in.</p>
      {reason === "idle" ? (
        <div className="mt-5">
          <Notice tone="pend">You were signed out after 30 minutes without activity.</Notice>
        </div>
      ) : me?.state === "verify" ? (
        <div className="mt-5">
          <Notice tone="pend">For your security, sign in again to keep using the portal.</Notice>
        </div>
      ) : null}
      <form className="mt-6 flex flex-col gap-4" onSubmit={submit} noValidate>
        <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <Notice tone="err">{error}</Notice> : null}
        <Button type="submit" variant="lime" size="lg" fullWidth loading={busy}>
          Continue
        </Button>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href={adminRoutes.forgotPassword} className="inline-flex min-h-11 items-center font-semibold">
          Forgot password?
        </Link>
        <span className="text-muted">
          New to the team?{" "}
          <Link href={adminRoutes.apply} className="font-semibold">
            Apply for access
          </Link>
        </span>
      </div>
    </Card>
  );
}

export function ApplyForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const ruleId = useId();
  const [form, setForm] = useState({ name: "", email: "", phone: "", jobTitle: "", note: "", password: "" });
  const [step, setStep] = useState<"form" | "code">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const send = async () => {
    await signIn("password", {
      flow: "staffApply",
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      jobTitle: form.jobTitle.trim(),
      note: form.note.trim(),
      password: form.password,
    });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await send();
      setStep("code");
    } catch (err) {
      setError(adminError(err));
    } finally {
      setBusy(false);
    }
  };

  if (step === "code") {
    return (
      <Card>
        <CodeStep
          email={form.email.trim().toLowerCase()}
          purpose="confirm"
          resend={send}
          onBack={() => setStep("form")}
          onDone={() => router.replace(adminRoutes.home)}
        />
      </Card>
    );
  }

  return (
    <Card width={560}>
      <h1 className={authTitle}>Apply for staff access</h1>
      <p className="p mt-2">
        For people who work at Farmkeke. The Founder reviews every application and chooses your role. We&apos;ll email you
        when it&apos;s decided.
      </p>
      <form className="mt-6 flex flex-col gap-4" onSubmit={submit} noValidate>
        <TextField label="Full name" autoComplete="name" value={form.name} onChange={set("name")} required maxLength={80} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
          hint="Your work email if you have one. We send a code to confirm it."
          required
        />
        <PhoneField label="Phone" labelNote="(optional)" value={form.phone} onChange={set("phone")} placeholder="803 123 4567" />
        <TextField
          label="Your job at Farmkeke"
          value={form.jobTitle}
          onChange={set("jobTitle")}
          placeholder="For example: Customer support, Operations, Finance"
          required
          maxLength={80}
        />
        <TextArea
          label="Anything the Founder should know"
          labelNote="(optional)"
          rows={3}
          value={form.note}
          onChange={set("note")}
          maxLength={1000}
          hint="For example, your team, or what you need to do on the portal."
          className="[&_textarea]:h-auto [&_textarea]:py-3"
        />
        <div>
          <PasswordField
            label="Password"
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
            aria-describedby={ruleId}
            required
          />
          <StaffPasswordRules password={form.password} id={ruleId} />
          <p className="sm mt-2">Already have a Farmkeke account with this email? Enter that account&apos;s password instead.</p>
        </div>
        {error ? <Notice tone="err">{error}</Notice> : null}
        <Button type="submit" variant="lime" size="lg" fullWidth loading={busy}>
          Continue
        </Button>
      </form>
      <p className="mt-5 text-sm text-muted">
        Already approved?{" "}
        <Link href={adminRoutes.signIn()} className="font-semibold">
          Sign in
        </Link>
      </p>
    </Card>
  );
}

export function ForgotForm() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <Card>
        <span className="tile mb-5" aria-hidden>
          <MailCheck className="size-6" strokeWidth={1.75} />
        </span>
        <h1 className={authTitle}>Check your email</h1>
        <p className="p mt-2">
          If <strong className="text-ink">{email.trim()}</strong> is on the admin portal, we&apos;ve sent a link to make a new
          password. It works for 60 minutes, and only once.
        </p>
        <div className="mt-6">
          <ButtonLink href={adminRoutes.signIn()} variant="ghost">
            Back to sign in
          </ButtonLink>
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <h1 className={authTitle}>Forgot your password?</h1>
      <p className="p mt-2">Enter your staff email. We&apos;ll send you a link to make a new password.</p>
      <form
        className="mt-6 flex flex-col gap-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await signIn("password", { flow: "staffReset", email: email.trim() });
            setSent(true);
          } catch (err) {
            setError(adminError(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {error ? <Notice tone="err">{error}</Notice> : null}
        <Button type="submit" variant="lime" size="lg" fullWidth loading={busy}>
          Send the link
        </Button>
      </form>
      <Link href={adminRoutes.signIn()} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold">
        Back to sign in
      </Link>
    </Card>
  );
}

export function SetPasswordForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const params = useSearchParams();
  const ruleId = useId();
  const email = params.get("email") ?? "";
  const code = params.get("code") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  if (!email || !code || expired) {
    return (
      <Card>
        <h1 className={authTitle}>This link has expired</h1>
        <p className="p mt-2">Password links work for 60 minutes, and only once. Ask for a new one.</p>
        <div className="mt-6">
          <ButtonLink href={adminRoutes.forgotPassword} variant="lime">
            Send a new link
          </ButtonLink>
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <h1 className={authTitle}>Make your password</h1>
      <p className="p mt-2">
        For <strong className="text-ink">{email}</strong> on the Farmkeke admin portal. You&apos;ll be signed in straight
        away.
      </p>
      <form
        className="mt-6 flex flex-col gap-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirm) {
            setError("The two passwords don't match.");
            return;
          }
          setBusy(true);
          setError(null);
          try {
            await signIn("password", { flow: "staffSetPassword", email, code, newPassword: password });
            router.replace(adminRoutes.home);
          } catch (err) {
            if (errorCode(err) === "INVALID_CODE") setExpired(true);
            else setError(adminError(err));
            setBusy(false);
          }
        }}
      >
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <div>
          <PasswordField
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={ruleId}
            required
          />
          <StaffPasswordRules password={password} id={ruleId} />
        </div>
        <PasswordField
          label="Type it again"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error ? <Notice tone="err">{error}</Notice> : null}
        <Button type="submit" variant="lime" size="lg" fullWidth loading={busy}>
          Save and sign in
        </Button>
      </form>
    </Card>
  );
}
