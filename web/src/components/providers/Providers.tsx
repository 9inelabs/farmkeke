"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { MotionProvider } from "@/lib/motion";

// One client for the whole site, pointed at the same Convex deployment as the app.
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return (
    // Sessions are kept in this browser, so people stay signed in. Guests get an
    // anonymous identity here too, so only this browser can confirm their orders.
    // shouldHandleCode=false: there is no OAuth sign-in, and the password reset
    // link (/reset-password?email=&code=) must keep its code for the reset form.
    <ConvexAuthProvider client={convex} storageNamespace="farmkeke" shouldHandleCode={false}>
      <MotionProvider>{children}</MotionProvider>
    </ConvexAuthProvider>
  );
}
