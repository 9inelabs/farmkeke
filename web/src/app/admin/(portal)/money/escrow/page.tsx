import type { Metadata } from "next";
import { EscrowView } from "./EscrowView";

export const metadata: Metadata = { title: "Escrow ledger" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-60 Escrow ledger.
export default function AdminEscrowPage() {
  return <EscrowView />;
}
