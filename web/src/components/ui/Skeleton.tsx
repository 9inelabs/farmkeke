// Loading skeletons (W-S4). A soft pulse (opacity only). When data arrives,
// wrap the real content in <Reveal> from @/lib/motion so it fades in.
import type { CSSProperties } from "react";

export function Skeleton({ className, style, rounded = 10 }: { className?: string; style?: CSSProperties; rounded?: number }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse bg-[#E9EBE5] ${className ?? ""}`}
      style={{ borderRadius: rounded, ...style }}
    />
  );
}

/** Announces loading to screen readers while skeletons are shown. */
export function LoadingRegion({ label = "Loading", children }: { label?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
