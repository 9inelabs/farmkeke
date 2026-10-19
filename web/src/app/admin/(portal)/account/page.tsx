import type { Metadata } from "next";
import { AccountView } from "./AccountView";

export const metadata: Metadata = { title: "Your account" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

export default function AdminAccountPage() {
  return <AccountView />;
}
