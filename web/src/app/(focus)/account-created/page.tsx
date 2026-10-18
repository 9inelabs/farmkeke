import type { Metadata } from "next";
import { AccountCreatedView } from "./AccountCreatedView";

export const metadata: Metadata = { title: "Welcome to Farmkeke", robots: { index: false } };

// W-42 Account created
export default function AccountCreatedPage() {
  return <AccountCreatedView />;
}
