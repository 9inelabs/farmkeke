import type { Metadata } from "next";
import { DashboardView } from "./DashboardView";

export const metadata: Metadata = { title: "Dashboard" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

export default function AdminHomePage() {
  return <DashboardView />;
}
