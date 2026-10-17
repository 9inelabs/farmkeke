"use client";

import { PageTransition } from "@/lib/motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
