"use client";

// A "Cookie settings" link-style button for the footer. It reopens the W-88
// cookie settings modal. Usable from server components:
//   <CookieSettingsButton className="..." />
import type { ReactNode } from "react";
import { openCookieSettings } from "@/lib/consent";

export function CookieSettingsButton({ className, children = "Cookie settings" }: { className?: string; children?: ReactNode }) {
  return (
    <button type="button" onClick={openCookieSettings} className={`cursor-pointer text-left ${className ?? ""}`}>
      {children}
    </button>
  );
}
