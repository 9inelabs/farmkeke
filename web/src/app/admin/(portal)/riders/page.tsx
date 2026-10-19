import type { Metadata } from "next";
import { RidersView } from "./RidersView";

export const metadata: Metadata = { title: "Riders" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-55 Riders.
export default function AdminRidersPage() {
  return <RidersView />;
}
