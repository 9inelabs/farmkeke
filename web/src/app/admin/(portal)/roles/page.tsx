import type { Metadata } from "next";
import { RolesView } from "./RolesView";

export const metadata: Metadata = { title: "Roles and permissions" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

export default function AdminRolesPage() {
  return <RolesView />;
}
