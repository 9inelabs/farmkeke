"use client";

// A-89 Roles: each is a set of permissions. The Founder can create roles and
// change what each can do (roles.manage).
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useStaff } from "@/components/admin/context";
import { adminRoutes } from "@/components/admin/routes";
import { PageHeader, TableSkeleton } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";
import { admin } from "@/convex/admin";
import type { PermissionInfo, RoleRow } from "@/convex/returns/admin";
import { plural } from "@/lib/format";

export function RolesView() {
  const me = useStaff();
  const roles = useQuery(admin.staff.listRoles, {}) as RoleRow[] | undefined;
  const catalog = useQuery(admin.access.permissionCatalog, {}) as PermissionInfo[] | undefined;
  const total = catalog?.length ?? 0;
  return (
    <>
      <PageHeader
        title="Roles and permissions"
        description="A role decides what someone can see and do on the portal. Every action is checked on the server too."
        actions={
          me.can("roles.manage") ? (
            <ButtonLink href={adminRoutes.newRole} variant="lime" icon={<Plus aria-hidden className="size-[18px]" />}>
              New role
            </ButtonLink>
          ) : null
        }
      />
      {roles === undefined ? (
        <TableSkeleton />
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 m:grid-cols-1">
          {roles.map((r) => (
            <li key={r._id}>
              <Link
                href={adminRoutes.role(r._id)}
                className="card flex h-full flex-col gap-2 p-5 text-ink hover:shadow-[inset_0_0_0_1px_var(--color-forest)]"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="h3">{r.name}</span>
                  {r.builtIn ? <span className="badge b-grey">Built in</span> : <span className="badge b-fresh">Custom</span>}
                </span>
                <span className="text-sm leading-5 text-muted">{r.description || "No description."}</span>
                <span className="mt-auto pt-2 text-[13px] font-semibold text-ink-3">
                  {plural(r.members, "person", "people")} · {r.permissions.length} of {total || "–"} permissions
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
