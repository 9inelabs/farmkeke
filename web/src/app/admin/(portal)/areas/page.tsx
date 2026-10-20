import type { Metadata } from "next";
import { AreasView } from "./AreasView";

export const metadata: Metadata = { title: "Delivery areas" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-83 Delivery areas (delivery is priced per order on Dispatch).
export default function AdminAreasPage() {
  return <AreasView />;
}
