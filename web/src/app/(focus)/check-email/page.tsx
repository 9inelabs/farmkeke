import type { Metadata } from "next";
import { CheckEmailView } from "./CheckEmailView";

export const metadata: Metadata = { title: "Check your email", robots: { index: false } };

// W-42b Check your email
export default function CheckEmailPage() {
  return <CheckEmailView />;
}
