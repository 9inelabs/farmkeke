import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpView } from "./SignUpView";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a Farmkeke account to save addresses, follow orders on any device and check out in seconds.",
  robots: { index: false },
};

// W-41 Create account
export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpView next={null} />}>
      <SignUpView />
    </Suspense>
  );
}
