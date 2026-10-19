import type { Metadata } from "next";
import { UnitsView } from "./UnitsView";

export const metadata: Metadata = { title: "Units" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-81 Units of measure farmers sell in.
export default function AdminUnitsPage() {
  return <UnitsView />;
}
