import type { Metadata } from "next";
import { Suspense } from "react";
import { SetPasswordForm } from "@/components/admin/AuthForms";

export const metadata: Metadata = { title: "Make your password" };

// From the emailed link: the Founder's first password, and forgot password.
export default function AdminSetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}
