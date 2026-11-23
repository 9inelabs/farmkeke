"use client";

// The signed-in staff member: role, what it allows, session, password.
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { adminError } from "@/components/admin/errors";
import { adminRoutes } from "@/components/admin/routes";
import { Facts, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import { api } from "@/convex/api";
import { initials } from "@/lib/format";
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
          <PhotoPanel />
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

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** The staff member's profile photo, shown in the portal's top bar. The same photo as the app's profile. */
function PhotoPanel() {
  const me = useStaff();
  const uploadUrl = useMutation(api.profilePhoto.generateUploadUrl);
  const setPhoto = useMutation(api.profilePhoto.set);
  const removePhoto = useMutation(api.profilePhoto.remove);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Choose a photo (JPG, PNG or WebP).");
    if (file.size > MAX_PHOTO_BYTES) return setError("That photo is over 10 MB. Choose a smaller one.");
    setBusy(true);
    try {
      const url = (await uploadUrl({})) as string;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("upload");
      const { storageId } = (await res.json()) as { storageId: string };
      await setPhoto({ storageId: storageId as never });
    } catch (e) {
      setError(e instanceof Error && e.message === "upload" ? "The photo didn't upload. Try again." : adminError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Profile photo" description="Shown next to your name in the portal.">
      <div className="flex items-center gap-4">
        {me.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a Convex storage URL
          <img src={me.photoUrl} alt="" className="size-20 flex-none rounded-full object-cover shadow-[0_0_0_4px_var(--color-lime-soft)]" />
        ) : (
          <span aria-hidden className="flex size-20 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#2B5220,#1E3B16)] font-display text-xl font-bold text-lime">
            {initials(me.name)}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <label className={`btn ghost sm cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
            {busy ? "Uploading…" : me.photoUrl ? "Change photo" : "Upload photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
          </label>
          {me.photoUrl ? (
            <Button
              variant="link"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setError(null);
                try {
                  await removePhoto({});
                } catch (e) {
                  setError(adminError(e));
                }
              }}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <div className="mt-3">
          <Notice tone="err">{error}</Notice>
        </div>
      ) : null}
    </Panel>
  );
}
