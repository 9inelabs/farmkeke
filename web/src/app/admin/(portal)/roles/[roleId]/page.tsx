import type { Metadata } from "next";
import { ParamPage } from "@/components/admin/ParamPage";
import { TableSkeleton } from "@/components/admin/ui";
import { RoleEditor } from "../RoleEditor";

export const metadata: Metadata = { title: "Role" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

export default function AdminRolePage({ params }: { params: Promise<{ roleId: string }> }) {
  return <ParamPage params={params} name="roleId" fallback={<TableSkeleton />} render={(id) => <RoleEditor roleId={id} />} />;
}
