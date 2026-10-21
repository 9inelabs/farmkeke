"use client";

// W-49 Delete account (account.deleteAccount, password required). Orders in
// progress are flagged first: the backend finishes the deletion once they
// complete, and says which happened ({ status }). The optional "Why are you
// leaving?" reason is stored with the deletion record.
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useQuery } from "convex/react";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AccountShell, AccountTitle } from "@/components/account/AccountShell";
import { forgetShortSession } from "@/components/account/SessionKeeper";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PasswordField, SelectField } from "@/components/ui/Field";
import { api } from "@/convex/api";
import type { OrderRow } from "@/convex/returns/checkout";
import { errorCode } from "@/lib/auth";
import { plural } from "@/lib/format";
import { routes } from "@/lib/routes";

export function DeleteAccountView() {
  return (
    <AccountShell>
      <Delete />
    </AccountShell>
  );
}

const REASONS = [
  "I don't use Farmkeke enough",
  "Prices or delivery fees",
  "Not available in my area",
  "I had a problem with an order",
  "Something else",
];

function Delete() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const remove = useAction(api.account.deleteAccount);
  const orders = useQuery(api.orders.consumer.list, {}) as OrderRow[] | undefined;
  const inProgress = (orders ?? []).filter((o) => o.isActive && o.status !== "awaiting_payment");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"password" | "understood" | "form", string>>>({});
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState<number | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n: typeof errors = {};
    if (!password) n.password = "Enter your password to confirm.";
    if (!understood) n.understood = "Tick the box to confirm you understand.";
    setErrors(n);
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      const result = (await remove({ password, reason: reason || undefined })) as { status?: string } | null;
      if (result?.status === "waiting_for_orders") {
        // The account stays until the orders are done, so stay signed in.
        setBusy(false);
        setWaiting(Math.max(1, inProgress.length));
        return;
      }
      forgetShortSession();
      await signOut().catch(() => undefined);
      router.replace(routes.home);
    } catch (err) {
      setBusy(false);
      const code = errorCode(err);
      setErrors(
        code === "WRONG_PASSWORD"
          ? { password: "That isn't your password. Check it and try again." }
          : code === "TOO_MANY_ATTEMPTS"
            ? { password: "Too many tries. Wait 15 minutes, then try again." }
            : code === "STAFF_ACCOUNT"
              ? { form: "Staff accounts can't be deleted here. Ask an admin." }
              : { form: "We couldn't delete your account. Check your connection and try again." },
      );
    }
  };

  if (waiting !== null)
    return (
      <div className="flex max-w-[720px] flex-col gap-5">
        <AccountTitle title="Delete your account" />
        <section role="status" className="card p-6 m:p-4">
          <h2 className="m-0 text-base font-bold">We&apos;ll delete your account once your orders are done</h2>
          <p className="p mt-2">
            You have {plural(waiting, "order")} in progress. As soon as {waiting === 1 ? "it's" : "they're"} completed, we&apos;ll
            delete your account and email you. Until then you can still follow {waiting === 1 ? "it" : "them"} here.
          </p>
          <ButtonLink href={routes.myOrders} variant="ghost" className="mt-4 text-sm">
            See my orders
          </ButtonLink>
        </section>
      </div>
    );

  return (
    <div className="flex max-w-[720px] flex-col gap-5">
      <Link href={routes.profile} className="inline-flex min-h-11 w-max items-center gap-1 text-sm font-semibold">
        <ChevronLeft aria-hidden className="size-4" strokeWidth={2} />
        Profile and login
      </Link>
      <AccountTitle title="Delete your account" sub="This permanently removes your Farmkeke account on the website and in the app." />

      <section aria-labelledby="what-title" className="card p-6 m:p-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-[42px] flex-none items-center justify-center rounded-xl bg-err-bg text-err">
            <TriangleAlert className="size-5" strokeWidth={1.75} />
          </span>
          <h2 id="what-title" className="m-0 text-base font-bold">
            What happens when you delete
          </h2>
        </div>
        <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
          {[
            ["Your saved addresses, saved items and preferences are erased", true],
            ["You can no longer see past orders or receipts here", true],
            ["You can't undo this. To shop again you'd create a new account", true],
            ["We keep a record of past payments for accounting", false],
          ].map(([t, red]) => (
            <li key={t as string} className="flex gap-2.5 text-sm leading-[21px] text-ink-2">
              <span aria-hidden className={red ? "text-err" : "text-muted-2"}>
                •
              </span>
              {t}
            </li>
          ))}
        </ul>
        {inProgress.length > 0 ? (
          <div role="status" className="mt-3.5 rounded-xl bg-pend-bg px-3.5 py-3 text-[13px] leading-[19px] text-pend">
            You have {plural(inProgress.length, "order")} in progress. If you delete now, we&apos;ll finish deleting your
            account once {inProgress.length === 1 ? "it's" : "they're"} completed. Until then you can still follow{" "}
            {inProgress.length === 1 ? "it" : "them"} by text message.
          </div>
        ) : (
          <p className="sm mt-3.5">If you have an order in progress, you can delete your account once it&apos;s completed.</p>
        )}
      </section>

      <section aria-label="Confirm deletion" className="card p-6 m:p-4">
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <SelectField
            label="Why are you leaving?"
            labelNote="(optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="[&_select]:h-[50px]"
          >
            <option value="">Choose a reason</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </SelectField>
          <PasswordField
            label="Enter your password to confirm"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            className="[&_input]:h-[50px]"
          />
          <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm leading-5">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                aria-invalid={errors.understood ? true : undefined}
                aria-describedby={errors.understood ? "understood-error" : undefined}
                className="m-0 mt-px size-[18px] flex-none accent-err"
              />
              I understand my account and saved details will be deleted permanently
            </label>
            {errors.understood ? (
              <span id="understood-error" role="alert" className="field-error">
                {errors.understood}
              </span>
            ) : null}
          </div>
          {errors.form ? (
            <p role="alert" className="field-error m-0">
              {errors.form}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2.5 pt-2 shadow-[inset_0_1px_0_#EEF0EB]">
            <ButtonLink href={routes.profile} variant="ghost" className="mt-3.5 text-sm">
              Keep my account
            </ButtonLink>
            <Button type="submit" variant="danger" loading={busy} className="mt-3.5 bg-err text-sm hover:bg-[#9e2a2a]">
              {inProgress.length > 0 ? "Delete when my orders finish" : "Delete account"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
