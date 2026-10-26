"use client";

// Decides what a visitor to /admin sees (admin/access.me):
//   signed out, or staff whose session needs the emailed code → sign in
//   signed in but never applied → "not on the portal" (apply or sign out)
//   applied → their application's status (and a form when asked for more)
//   access removed → a notice
//   staff → the portal
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Clock, MessageSquareText, ShieldOff, UserX } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AuthCard, authTitle } from "@/components/account/AuthLayouts";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { admin } from "@/convex/admin";
import type { AdminMe } from "@/convex/returns/admin";
import { adminPath, portalPath } from "@/lib/adminHost";
import { dateTime } from "@/lib/format";
import { AdminShell } from "./AdminShell";
import { StaffProvider } from "./context";
import { adminError } from "./errors";
import { adminRoutes } from "./routes";
import { Notice } from "./ui";

export function AdminGate({ children }: { children: ReactNode }) {
  const { isLoading } = useConvexAuth();
  const me = useQuery(admin.access.me, isLoading ? "skip" : {}) as AdminMe | undefined;
  const pathname = usePathname();
  const router = useRouter();
  const toSignIn = me?.state === "signed_out" || me?.state === "verify";

  useEffect(() => {
    if (toSignIn) router.replace(adminRoutes.signIn(adminPath(portalPath(pathname))));
  }, [toSignIn, pathname, router]);

  if (me === undefined || toSignIn) return <PortalSkeleton />;
  if (me.state === "staff") {
    return (
      <StaffProvider me={me}>
        <AdminShell>{children}</AdminShell>
      </StaffProvider>
    );
  }
  if (me.state === "not_staff") return <NotStaff email={me.email} />;
  if (me.state === "deactivated") return <Deactivated note={me.note} />;
  return <Application me={me} />;
}

export function PortalSkeleton() {
  return (
    <div className="min-h-dvh bg-canvas" aria-busy="true">
      <span className="sr-only" role="status">
        Loading the admin portal
      </span>
      <div className="fixed inset-y-0 left-0 w-[256px] bg-surface shadow-[inset_-1px_0_0_var(--color-line)] m:hidden" />
      <div className="pl-[256px] m:pl-0">
        <div className="h-16 bg-surface shadow-[inset_0_-1px_0_var(--color-line)]" />
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-8 pt-8 m:px-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 max-w-full" />
          <Skeleton className="mt-4 h-48 w-full" rounded={18} />
        </div>
      </div>
    </div>
  );
}

function SignOutButton() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await signOut();
        router.replace(adminRoutes.signIn());
      }}
    >
      Sign out
    </Button>
  );
}

function StatusCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <AuthCard width={560} headerRight={<SignOutButton />}>
      <span className="tile mb-5" aria-hidden>
        {icon}
      </span>
      <h1 className={authTitle}>{title}</h1>
      {children}
    </AuthCard>
  );
}

function NotStaff({ email }: { email: string | null }) {
  return (
    <StatusCard icon={<UserX className="size-6" strokeWidth={1.75} />} title="This account isn't on the admin portal">
      <p className="p mt-2">
        {email ? (
          <>
            You&apos;re signed in as <strong className="text-ink">{email}</strong>, which hasn&apos;t applied for staff access.
          </>
        ) : (
          "This account hasn't applied for staff access."
        )}{" "}
        Farmkeke staff apply once, then the Founder approves them and gives them a role.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href={adminRoutes.apply} variant="lime">
          Apply for access
        </ButtonLink>
        <SignOutButton />
      </div>
    </StatusCard>
  );
}

function Deactivated({ note }: { note: string | null }) {
  return (
    <StatusCard icon={<ShieldOff className="size-6" strokeWidth={1.75} />} title="Your access was removed">
      <p className="p mt-2">You can&apos;t use the admin portal any more. Your Farmkeke shopping account still works.</p>
      {note ? (
        <div className="mt-4">
          <Notice tone="pend">Note from Farmkeke: {note}</Notice>
        </div>
      ) : null}
      <p className="p mt-4">If you think this is a mistake, contact the Founder.</p>
    </StatusCard>
  );
}

function Application({ me }: { me: Extract<AdminMe, { state: "application" }> }) {
  if (me.status === "rejected") {
    return (
      <StatusCard icon={<UserX className="size-6" strokeWidth={1.75} />} title="Your application wasn't approved">
        {me.note ? (
          <div className="mt-4">
            <Notice tone="err">Note from Farmkeke: {me.note}</Notice>
          </div>
        ) : null}
        <p className="p mt-4">If something has changed, you can apply again.</p>
        <div className="mt-6">
          <ButtonLink href={adminRoutes.apply} variant="lime">
            Apply again
          </ButtonLink>
        </div>
      </StatusCard>
    );
  }
  if (me.status === "more_info") {
    return (
      <StatusCard icon={<MessageSquareText className="size-6" strokeWidth={1.75} />} title="We need a bit more">
        <p className="p mt-2">The Founder looked at your application and has a question.</p>
        {me.note ? (
          <div className="mt-4">
            <Notice tone="pend">{me.note}</Notice>
          </div>
        ) : null}
        <UpdateForm me={me} />
      </StatusCard>
    );
  }
  return (
    <StatusCard icon={<Clock className="size-6" strokeWidth={1.75} />} title="Your application is waiting for review">
      <p className="p mt-2">
        The Founder reviews every application. We&apos;ll email <strong className="text-ink">{me.email}</strong> as soon as it&apos;s
        decided, and tell you which role you&apos;ve been given.
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-soft p-4 m:grid-cols-1">
        <div>
          <dt className="cap">Name</dt>
          <dd className="m-0 mt-0.5 font-semibold">{me.name}</dd>
        </div>
        <div>
          <dt className="cap">Job</dt>
          <dd className="m-0 mt-0.5 font-semibold">{me.jobTitle}</dd>
        </div>
        <div>
          <dt className="cap">Applied</dt>
          <dd className="m-0 mt-0.5 font-semibold">{dateTime(me.appliedAt)}</dd>
        </div>
        <div>
          <dt className="cap">Status</dt>
          <dd className="m-0 mt-0.5">
            <span className="badge b-pend">Waiting for review</span>
          </dd>
        </div>
      </dl>
    </StatusCard>
  );
}

function UpdateForm({ me }: { me: Extract<AdminMe, { state: "application" }> }) {
  const update = useMutation(admin.access.updateApplication);
  const [jobTitle, setJobTitle] = useState(me.jobTitle);
  const [note, setNote] = useState(me.applicationNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="mt-6 flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await update({ jobTitle, note, phone: me.phone ?? undefined });
        } catch (err) {
          setError(adminError(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <TextField label="Your job at Farmkeke" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required maxLength={80} />
      <TextArea
        label="Your answer"
        hint="This replaces the note on your application."
        rows={5}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        className="[&_textarea]:h-auto [&_textarea]:py-3"
      />
      {error ? <Notice tone="err">{error}</Notice> : null}
      <div>
        <Button type="submit" variant="lime" loading={busy}>
          Send for review
        </Button>
      </div>
    </form>
  );
}
