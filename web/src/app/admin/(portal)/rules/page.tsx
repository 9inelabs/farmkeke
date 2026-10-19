import type { Metadata } from "next";
import { RulesView } from "./RulesView";

export const metadata: Metadata = { title: "Fees and rules" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-84 Fees and commission, A-85 Order and escrow rules.
export default function AdminRulesPage() {
  return <RulesView />;
}
