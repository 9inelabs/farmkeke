import type { Metadata } from "next";
import { FarmsView } from "./FarmsView";

export const metadata: Metadata = { title: "Farms" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-30 Farmers: approved farms, active or suspended.
export default function AdminFarmsPage() {
  return <FarmsView />;
}
