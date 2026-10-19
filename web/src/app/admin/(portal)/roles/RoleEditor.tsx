"use client";

// Create or edit a role: a name, a short description and its permissions,
// grouped as on the server (convex/lib/permissions.ts). The Founder role is
// shown read-only. Without roles.manage, every role is read-only.
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStaff } from "@/components/admin/context";
import { adminError } from "@/components/admin/errors";
import { adminRoutes } from "@/components/admin/routes";
import { ConfirmDialog, Notice, PageHeader, Panel, TableSkeleton } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { admin } from "@/convex/admin";
import type { Id } from "@/convex/api";
import type { PermissionInfo, RoleRow } from "@/convex/returns/admin";

export function RoleEditor({ roleId }: { roleId: string | null }) {
  const roles = useQuery(admin.staff.listRoles, {}) as RoleRow[] | undefined;
  const catalog = useQuery(admin.access.permissionCatalog, {}) as PermissionInfo[] | undefined;
  if (roles === undefined || catalog === undefined) return <TableSkeleton />;
  const role = roleId ? (roles.find((r) => r._id === roleId) ?? null) : null;
  if (roleId && role === null) {
    return (
      <>
        <PageHeader title="Role not found" back={{ href: adminRoutes.roles, label: "Roles and permissions" }} />
        <Notice tone="err">This role no longer exists.</Notice>
      </>
    );
  }
  return <Form key={role?._id ?? "new"} role={role} catalog={catalog} />;
}

function Form({ role, catalog }: { role: RoleRow | null; catalog: PermissionInfo[] }) {
  const me = useStaff();
  const router = useRouter();
  const create = useMutation(admin.staff.createRole);
  const update = useMutation(admin.staff.updateRole);
  const remove = useMutation(admin.staff.deleteRole);
  const readOnly = !me.can("roles.manage") || (role !== null && !role.editable);
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [perms, setPerms] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const groups = catalog.reduce<Record<string, PermissionInfo[]>>((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});
  const toggle = (key: string) => {
    setSaved(false);
    setPerms((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = { name, description, permissions: [...perms] };
      if (role) {
        await update({ roleId: role._id, ...payload });
        setSaved(true);
      } else {
        const id = (await create(payload)) as Id<"staffRoles">;
        router.replace(adminRoutes.role(id));
      }
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={role ? role.name : "New role"}
        description={
          role && !role.editable
            ? "The Founder role can do everything and can't be changed."
            : readOnly
              ? "Only the Founder can change roles."
              : "Tick what people with this role can do. Changes apply to everyone with the role straight away."
        }
        back={{ href: adminRoutes.roles, label: "Roles and permissions" }}
      />
      <div className="flex flex-col gap-6">
        <Panel>
          <div className="grid grid-cols-2 gap-4 m:grid-cols-1">
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} disabled={readOnly} required />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              disabled={readOnly}
              hint="One line, shown when choosing a role."
            />
          </div>
          {role ? <p className="sm mt-4">{role.members === 1 ? "1 person has" : `${role.members} people have`} this role.</p> : null}
        </Panel>
        {Object.entries(groups).map(([group, items]) => (
          <Panel key={group} title={group}>
            <ul className="m-0 flex list-none flex-col p-0">
              {items.map((p) => (
                <li key={p.key} className="shadow-[inset_0_-1px_0_var(--color-line-soft)] last:shadow-none">
                  <label className={`flex min-h-12 items-start gap-3 py-3 ${readOnly ? "" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      className="mt-0.5 size-5 flex-none accent-forest"
                      checked={perms.has(p.key)}
                      onChange={() => toggle(p.key)}
                      disabled={readOnly}
                    />
                    <span>
                      <span className="block text-[15px] font-semibold text-ink">{p.label}</span>
                      <span className="block text-sm leading-5 text-muted">{p.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
        {readOnly ? null : (
          <div className="sticky bottom-0 -mx-8 flex flex-wrap items-center gap-3 bg-canvas/95 px-8 py-4 backdrop-blur m:-mx-4 m:px-4">
            <Button variant="lime" onClick={save} loading={busy}>
              {role ? "Save changes" : "Create role"}
            </Button>
            {role && !role.builtIn ? (
              <Button variant="ghost" onClick={() => setDeleting(true)} disabled={role.members > 0}>
                Delete role
              </Button>
            ) : null}
            <span className="text-sm text-muted">{perms.size} permissions ticked</span>
            {saved ? <span className="text-sm font-semibold text-ok" role="status">Saved</span> : null}
            {role && !role.builtIn && role.members > 0 ? (
              <span className="text-sm text-muted">Move everyone to another role before deleting it.</span>
            ) : null}
            {error ? (
              <div className="w-full">
                <Notice tone="err">{error}</Notice>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {role ? (
        <ConfirmDialog
          open={deleting}
          onClose={() => setDeleting(false)}
          title={`Delete the ${role.name} role?`}
          description="This can't be undone. It's recorded in the audit log."
          confirmLabel="Delete role"
          variant="danger"
          onConfirm={async () => {
            await remove({ roleId: role._id });
            router.replace(adminRoutes.roles);
          }}
        />
      ) : null}
    </>
  );
}
