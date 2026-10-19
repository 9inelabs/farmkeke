"use client";

// The signed-in staff member: role, what it allows, session, password.
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { adminError } from "@/components/admin/errors";
import { adminRoutes } from "@/components/admin/routes";
import { Facts, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { PermissionInfo } from "@/convex/returns/admin";
import { dateTime } from "@/lib/format";

export function AccountView() {
  const me = useStaff();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const sendLink = useAction(admin.access.sendPasswordLink);
  const catalog = useQuery(admin.access.permissionCatalog, {}) as PermissionInfo[] | undefined;
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mine = (catalog ?? []).filter((p) => me.permissions.includes(p.key));

  return (
    <>
      <PageHeader title="Your account" description="Your staff details on the admin portal." />
      <div className="grid grid-cols-[1fr_1fr] gap-6 m:grid-cols-1">
        <div className="flex flex-col gap-6">
          <Panel title="Details">
            <Facts
              items={[
                { label: "Name", value: me.name },
                { label: "Email", value: me.email },
                { label: "Role", value: me.role.name },
                { label: "This sign-in ends", value: me.sessionEndsAt ? dateTime(me.sessionEndsAt) : "–" },
              ]}
            />
            <p className="sm mt-4">
              Each sign-in lasts up to 12 hours, and ends after 30 minutes without activity. Then we email you a new code.
            </p>
          </Panel>
          <Panel title="Password" description="We email you a link to make a new password. It works for 60 minutes.">
            {sent ? (
              <Notice tone="ok">{sent}</Notice>
            ) : (
              <Button
                variant="ghost"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await sendLink({});
                    setSent(`We sent a link to ${me.email}.`);
                  } catch (e) {
                    setSent(adminError(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Email me a password link
              </Button>
            )}
          </Panel>
          <Panel title="Sign out">
            <Button
              variant="dark"
              onClick={async () => {
                await signOut();
                router.replace(adminRoutes.signIn());
              }}
            >
              Sign out
            </Button>
          </Panel>
        </div>
        <Panel title="What you can do" description={`${me.role.name} role`}>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {mine.map((p) => (
              <li key={p.key} className="text-sm leading-5 text-ink-2">
                <span className="font-semibold text-ink">{p.label}.</span> {p.description}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
