import type { Metadata } from "next";
import { AreasView } from "./AreasView";

export const metadata: Metadata = { title: "Areas and delivery fees" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-83 Service areas and delivery fees.
export default function AdminAreasPage() {
  return <AreasView />;
}
