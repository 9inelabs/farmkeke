// Shared pieces of the landing and information pages (Main, W-60, W-80 to W-87).
// Class strings port the designs' own type scale and surfaces exactly:
// the landing page (Main) uses a larger scale than the information pages.
import { Check, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Landing page (Main) type scale */
export const L = {
  h1: "font-display font-extrabold text-[68px] leading-[76px] tracking-[-0.035em] m:text-[40px] m:leading-[48px]",
  h2: "font-display font-bold text-[42px] leading-[50px] tracking-[-0.025em] m:text-[30px] m:leading-[38px]",
  h3: "font-display font-bold text-[19px] leading-[26px] tracking-[-0.01em]",
  /** .sec: 120px above each section, 80px on phones */
  sec: "pt-[120px] m:pt-20",
  card: "rounded-[22px] bg-surface shadow-[inset_0_0_0_1px_var(--color-line)]",
  /** .panel: 32px radius, 64px padding; phones 24px radius, 32/22px padding */
  panel: "rounded-[32px] p-16 m:rounded-[24px] m:px-[22px] m:py-8",
  sechead: "mx-auto mb-14 flex max-w-[680px] flex-col items-center gap-4 text-center m:mb-9",
};

/** Information pages (W-60, W-80 to W-87) type scale */
export const S = {
  h1: "font-display font-extrabold text-[52px] leading-[60px] tracking-[-0.03em] m:text-[36px] m:leading-[44px]",
  h2: "font-display font-bold text-[34px] leading-[42px] tracking-[-0.02em] m:text-[27px] m:leading-[35px]",
  h3: "font-display font-bold text-[18px] leading-[25px] tracking-[-0.01em]",
  /** .sec: 96px above each section, 64px on phones */
  sec: "pt-24 m:pt-16",
  card: "rounded-[20px] bg-surface shadow-[inset_0_0_0_1px_var(--color-line)]",
  /** .panel: 28px radius, 56px padding; phones 22px radius, 28/20px padding */
  panel: "rounded-[28px] p-14 m:rounded-[22px] m:px-5 m:py-7",
  sechead: "mx-auto mb-11 flex max-w-[680px] flex-col items-center gap-3.5 text-center",
};

/** Lead size without colour, for coloured panels */
export const leadSize = "m-0 text-lg leading-[29px] m:text-base m:leading-[26px]";
export const lead = `${leadSize} text-muted`;
/** Heading base without size, for headings the design resizes inline */
export const h3b = "font-display font-bold tracking-[-0.01em]";
/** Surface used by .card and .panel together (no radius) */
export const surface = "bg-surface shadow-[inset_0_0_0_1px_var(--color-line)]";
export const para = "m-0 text-[15px] leading-6 text-muted";
export const cap = "text-xs leading-4 text-subtle";
/** Design .btn is 48px tall (.btn.sm 40px) */
export const btn = "btn h-12 px-[22px] text-[15px]";
export const btnSm = "btn sm px-4 text-sm";
/** Design .chip (34px in the design, 40px here for tapping) */
export const chip =
  "inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink shadow-[inset_0_0_0_1px_var(--color-line-2)]";
/** Design .num step circle (40px on information pages) */
export const num =
  "flex size-10 flex-none items-center justify-center rounded-full bg-forest font-display text-base font-bold text-white";

/** Small rounded label above headings (.eyebrow with its .dot icon). */
export function Eyebrow({
  icon: Icon,
  children,
  dark = false,
  className,
}: {
  icon: LucideIcon;
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-8 items-center gap-2 rounded-full pr-3.5 pl-1.5 text-[13px] font-medium ${
        dark
          ? "bg-white/8 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
          : "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-field)]"
      } ${className ?? ""}`}
    >
      <span
        className={`flex size-5 items-center justify-center rounded-full ${dark ? "bg-lime text-forest" : "bg-tint text-forest"}`}
      >
        <Icon aria-hidden size={12} strokeWidth={2.25} />
      </span>
      {children}
    </span>
  );
}

/** The 46px rounded icon square (.tile). */
export function Tile({
  icon: Icon,
  size = 46,
  className,
  iconSize = 22,
  style,
}: {
  icon: LucideIcon;
  size?: number;
  className?: string;
  iconSize?: number;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`flex flex-none items-center justify-center bg-tint text-forest ${className ?? ""}`}
      style={{ width: size, height: size, borderRadius: size >= 46 ? 13 : size >= 42 ? 12 : 11, ...style }}
    >
      <Icon aria-hidden size={iconSize} strokeWidth={1.75} />
    </span>
  );
}

/** Lime check circle used in benefit lists (.ok, 22–24px). */
export function OkDot({ size = 22 }: { size?: number }) {
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full bg-lime text-forest"
      style={{ width: size, height: size }}
    >
      <Check aria-hidden size={13} strokeWidth={3} />
    </span>
  );
}

