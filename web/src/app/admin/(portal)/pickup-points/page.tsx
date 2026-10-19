import type { Metadata } from "next";
import { PickupPointsView } from "./PickupPointsView";

export const metadata: Metadata = { title: "Pickup points" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-82 Pickup locations.
export default function AdminPickupPointsPage() {
  return <PickupPointsView />;
}
