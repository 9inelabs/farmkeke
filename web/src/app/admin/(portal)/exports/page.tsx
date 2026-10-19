import type { Metadata } from "next";
import { ExportsView } from "./ExportsView";

export const metadata: Metadata = { title: "Exports" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

export default function AdminExportsPage() {
  return <ExportsView />;
}
