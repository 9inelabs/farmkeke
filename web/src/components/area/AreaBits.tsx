"use client";

// Tiny client islands that show or change the shopper's chosen area on
// server-rendered pages.
import { area, areaPicker } from "@/lib/area";
import { m, pressable } from "@/lib/motion";

/** Renders `${before}${area name}${after}` once an area is chosen, otherwise `fallback`. */
export function AreaPhrase({ before = "", after = "", fallback = "" }: { before?: string; after?: string; fallback?: string }) {
  const chosen = area.use();
  return <>{chosen ? `${before}${chosen.name}${after}` : fallback}</>;
}

export function ChangeAreaButton({ className, children = "Change delivery area" }: { className?: string; children?: string }) {
  return (
    <m.button type="button" onClick={areaPicker.open} aria-haspopup="dialog" className={`btn ghost ${className ?? ""}`} {...pressable}>
      {children}
    </m.button>
  );
}
