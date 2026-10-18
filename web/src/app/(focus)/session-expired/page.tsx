import type { Metadata } from "next";
import { Suspense } from "react";
import { SessionExpiredView } from "./SessionExpiredView";

export const metadata: Metadata = {
  title: "Please sign in again",
  description: "For your security, you were signed out after a long time away.",
  robots: { index: false },
};

export default function SessionExpiredPage() {
  // ?next= is read on the client (useSearchParams), so it sits in its own
  // boundary; the prerendered fallback is the same screen without it.
  return (
    <Suspense fallback={<SessionExpiredView next={null} />}>
      <SessionExpiredView />
    </Suspense>
  );
}
