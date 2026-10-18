import type { Metadata } from "next";
import { PasswordChangedView } from "./PasswordChangedView";

export const metadata: Metadata = { title: "Your password is changed", robots: { index: false } };

// W-42d Password changed
export default function PasswordChangedPage() {
  return <PasswordChangedView />;
}
