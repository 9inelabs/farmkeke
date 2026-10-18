import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordView } from "./ResetPasswordView";

export const metadata: Metadata = { title: "Create a new password", robots: { index: false } };

// W-42c Create new password. Opened from the emailed link
// (/reset-password?email=…&code=…), read on the client inside a boundary.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordView email={null} code={null} />}>
      <ResetPasswordView />
    </Suspense>
  );
}
