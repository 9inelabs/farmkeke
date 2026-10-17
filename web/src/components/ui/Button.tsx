"use client";

import Link from "next/link";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { m, pressable } from "@/lib/motion";

export type ButtonVariant = "lime" | "dark" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon shown before the label. Icons always come with a visible text label. */
  icon?: ReactNode;
  iconAfter?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

const classes = ({ variant = "lime", size = "md", fullWidth, className }: Omit<Common, "children">) =>
  ["btn", variant, size === "md" ? "" : size, fullWidth ? "w-full" : "", className ?? ""].filter(Boolean).join(" ");

type ButtonProps = Common &
  Omit<ComponentProps<"button">, "children" | "className"> & {
    /** Shows a spinner, keeps the label for screen readers and blocks double taps. */
    loading?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon, iconAfter, fullWidth, className, children, loading, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <m.button
      ref={ref}
      type={type}
      className={classes({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...pressable}
      {...(rest as object)}
    >
      {loading ? <Loader2 aria-hidden className="size-[18px] animate-spin" /> : icon}
      <span>{children}</span>
      {iconAfter}
    </m.button>
  );
});

type ButtonLinkProps = Common & Omit<ComponentProps<typeof Link>, "children" | "className">;

export function ButtonLink({ variant, size, icon, iconAfter, fullWidth, className, children, ...rest }: ButtonLinkProps) {
  return (
    // Press feedback sits on a wrapper so the link stays a plain, fast <a>.
    <m.span className={fullWidth ? "flex w-full" : "inline-flex"} {...pressable}>
      <Link className={classes({ variant, size, fullWidth, className })} {...rest}>
        {icon}
        <span>{children}</span>
        {iconAfter}
      </Link>
    </m.span>
  );
}
