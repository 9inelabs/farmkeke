import type { Metadata } from "next";
import { DeleteAccountView } from "./DeleteAccountView";

export const metadata: Metadata = { title: "Delete your account", robots: { index: false } };

// W-49 Delete account
export default function DeleteAccountPage() {
  return <DeleteAccountView />;
}
