import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/admin/AuthForms";

export const metadata: Metadata = { title: "Sign in" };

// A-01 Staff sign-in: password, then the emailed code.
export default function AdminSignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
