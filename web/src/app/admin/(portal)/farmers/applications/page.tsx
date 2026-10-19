import type { Metadata } from "next";
import { ApplicationsView } from "./ApplicationsView";

export const metadata: Metadata = { title: "Farmer applications" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-20 Farmer requests: new applications first, oldest waiting at the top.
export default function AdminFarmerApplicationsPage() {
  return <ApplicationsView />;
}
