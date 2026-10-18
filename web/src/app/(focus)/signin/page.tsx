import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInView } from "./SignInView";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Farmkeke to track your orders and check out faster.",
  robots: { index: false },
};

// W-40 Sign in. ?next= is read on the client, so the form sits in a boundary;
// the prerendered fallback is the same form without a return address.
export default function SignInPage() {
  return (
    <Suspense fallback={<SignInView next={null} />}>
      <SignInView />
    </Suspense>
  );
}
