import type { Metadata } from "next";
import { DispatchView } from "./DispatchView";

export const metadata: Metadata = { title: "Dispatch" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-53 Dispatch board, A-54 Assign rider and update delivery.
export default function AdminDispatchPage() {
  return <DispatchView />;
}
