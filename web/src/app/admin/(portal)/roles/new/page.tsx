import type { Metadata } from "next";
import { RoleEditor } from "../RoleEditor";

export const metadata: Metadata = { title: "New role" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

export default function AdminNewRolePage() {
  return <RoleEditor roleId={null} />;
}
