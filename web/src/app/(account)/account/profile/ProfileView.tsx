"use client";

// W-45 Profile and login details: name (account.updateProfile), email
// (account.changeEmail, in a dialog) and password (account.changePassword).
// Email and password changes ask for the current password.
import { useAction, useMutation } from "convex/react";
import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { AccountShell, AccountTitle } from "@/components/account/AccountShell";
import { PasswordRules, strongPassword } from "@/components/account/AuthLayouts";
import { looksLikeEmail } from "@/components/checkout/draft";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Dialog";
import { PasswordField, TextField } from "@/components/ui/Field";
import { api } from "@/convex/api";
import { errorCode, useViewer } from "@/lib/auth";
import { displayPhone } from "@/lib/format";
import { routes } from "@/lib/routes";

export function ProfileView() {
  return (
    <AccountShell>
      <Profile />
    </AccountShell>
  );
}

const fin = "[&_input]:h-[50px]";

const wrongPassword = (code: string | undefined) =>
  code === "WRONG_PASSWORD"
    ? "That isn't your current password. Check it and try again."
    : code === "TOO_MANY_ATTEMPTS"
      ? "Too many tries. Wait 15 minutes, or reset your password."
      : undefined;

function Profile() {
  const { viewer } = useViewer();
  const [emailOpen, setEmailOpen] = useState(false);
  return (
    <>
      <AccountTitle title="Profile and login" sub="Keep your details up to date so farms and riders can reach you." />
      <PersonalDetails name={viewer?.name ?? ""} phone={viewer?.phone ?? ""} />

      <section aria-labelledby="login-title" className="card p-6 m:px-4">
        <div className="mb-[18px]">
          <h2 id="login-title" className="h3">
            Login details
          </h2>
          <p className="sm mt-0.5">Used to sign in on the website and in the app</p>
        </div>
        <div className="flex flex-wrap items-center gap-3.5 py-4">
          <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-xl bg-tint text-forest">
            <Mail className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="cap">Email</div>
            <div className="truncate text-[15px] font-semibold">{viewer?.email ?? "No email yet"}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEmailOpen(true)}>
            Change email
          </Button>
        </div>
        <div className="flex items-start gap-3.5 py-4 shadow-[inset_0_1px_0_#EEF0EB]">
          <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-xl bg-tint text-forest m:hidden">
            <Lock className="size-5" strokeWidth={1.75} />
          </span>
          <ChangePassword />
        </div>
        <p className="cap mt-1.5">For your security, we ask for your current password before changing your email or password.</p>
      </section>

      <section aria-labelledby="delete-title" className="card flex flex-wrap items-center gap-4 p-6 m:px-4">
        <div className="min-w-[240px] flex-1 m:min-w-0">
          <h2 id="delete-title" className="h3">
            Delete account
          </h2>
          <p className="sm mt-0.5">Permanently remove your account and saved details.</p>
        </div>
        <ButtonLink href={routes.deleteAccount} variant="ghost" className="text-sm text-err hover:text-err">
          Delete account
        </ButtonLink>
      </section>

      <ChangeEmail open={emailOpen} onClose={() => setEmailOpen(false)} current={viewer?.email ?? ""} />
    </>
  );
}

function PersonalDetails({ name: initial, phone }: { name: string; phone: string }) {
  const update = useMutation(api.account.updateProfile);
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Enter your full name.");
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await update({ name: name.trim() });
      setSaved(true);
    } catch (err) {
      setError(
        errorCode(err) === "NAME_TOO_LONG" ? "That name is too long. Use up to 80 characters." : "We couldn't save that. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="personal-title" className="card p-6 m:px-4">
      <div className="mb-[18px]">
        <h2 id="personal-title" className="h3">
          Personal details
        </h2>
        <p className="sm mt-0.5">Shown to the farm and rider on your orders</p>
      </div>
      <form noValidate onSubmit={save}>
        <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
          <TextField
            label="Full name"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
              setError(null);
            }}
            error={error}
            className={fin}
          />
          <TextField
            label="Phone number"
            type="tel"
            value={phone ? displayPhone(phone) : ""}
            placeholder="Added with your next order"
            readOnly
            hint="To change your phone number, contact support."
            className={`${fin} [&_input]:bg-soft`}
          />
        </div>
        <div className="mt-[18px] flex items-center justify-end gap-3">
          {saved ? (
            <span role="status" className="text-sm font-semibold text-ok">
              Saved
            </span>
          ) : null}
          <Button type="submit" variant="lime" className="text-sm" loading={busy}>
            Save changes
          </Button>
        </div>
      </form>
    </section>
  );
}

function ChangePassword() {
  const change = useAction(api.account.changePassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"current" | "next" | "confirm" | "form", string>>>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const curRef = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n: typeof errors = {};
    if (!current) n.current = "Enter your current password.";
    if (!strongPassword(next)) n.next = "Use 8 or more characters, with a letter and a number.";
    else if (confirm !== next) n.confirm = "The passwords don't match. Type the new password again.";
    setErrors(n);
    setDone(false);
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      await change({ currentPassword: current, newPassword: next });
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      const code = errorCode(err);
      const wrong = wrongPassword(code);
      if (wrong) {
        setErrors({ current: wrong });
        curRef.current?.focus();
      } else if (code === "WEAK_PASSWORD") setErrors({ next: "Use 8 or more characters, with a letter and a number." });
      else setErrors({ form: "We couldn't change your password. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="cap">Password</div>
      <div className="text-[15px] font-semibold">Change your password</div>
      <form noValidate onSubmit={submit} className="mt-3.5 flex max-w-[520px] flex-col gap-3.5">
        <PasswordField
          ref={curRef}
          label="Current password"
          autoComplete="current-password"
          placeholder="Enter your current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={errors.current}
          className={fin}
        />
        <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
          <div>
            <PasswordField
              label="New password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              error={errors.next}
              className={fin}
              {...(errors.next ? {} : { "aria-describedby": "profile-pw-rules" })}
            />
            {next ? <PasswordRules password={next} id="profile-pw-rules" /> : null}
          </div>
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="Type it again"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
            className={fin}
          />
        </div>
        {errors.form ? (
          <p role="alert" className="field-error m-0">
            {errors.form}
          </p>
        ) : null}
        {done ? (
          <p role="status" className="m-0 text-sm font-semibold text-ok">
            Password changed. You&apos;re still signed in here, and signed out on other devices.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="submit" variant="dark" className="text-sm" loading={busy}>
            Update password
          </Button>
          <Link href={routes.forgotPassword} className="inline-flex min-h-11 items-center text-[13px] font-semibold">
            Forgot your current password?
          </Link>
        </div>
      </form>
    </div>
  );
}

function ChangeEmail({ open, onClose, current }: { open: boolean; onClose: () => void; current: string }) {
  const change = useAction(api.account.changeEmail);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"email" | "password" | "form", string>>>({});
  const [busy, setBusy] = useState(false);

  const close = () => {
    setEmail("");
    setPassword("");
    setErrors({});
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n: typeof errors = {};
    if (!looksLikeEmail(email)) n.email = "Enter your new email address, e.g. name@example.com.";
    if (!password) n.password = "Enter your current password.";
    setErrors(n);
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      await change({ newEmail: email.trim(), currentPassword: password });
      close();
    } catch (err) {
      const code = errorCode(err);
      const wrong = wrongPassword(code);
      setErrors(
        wrong
          ? { password: wrong }
          : code === "EMAIL_TAKEN"
            ? { email: "Another account already uses this email." }
            : code === "INVALID_EMAIL"
              ? { email: "Check the email address, e.g. name@example.com." }
              : { form: "We couldn't change your email. Check your connection and try again." },
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Change email"
      description={current ? `You sign in with ${current} now.` : undefined}
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="change-email" variant="lime" loading={busy}>
            Save new email
          </Button>
        </div>
      }
    >
      <form id="change-email" noValidate onSubmit={submit} className="flex flex-col gap-4 pt-2">
        <TextField
          label="New email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          data-autofocus
        />
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        {errors.form ? (
          <p role="alert" className="field-error m-0">
            {errors.form}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
