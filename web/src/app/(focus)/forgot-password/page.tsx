import type { Metadata } from "next";
import { ForgotPasswordView } from "./ForgotPasswordView";

export const metadata: Metadata = { title: "Forgot your password?", robots: { index: false } };

// W-42a Forgot password
export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
