import { LifeBuoy, Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { HomeLogo } from "@/components/brand/Wordmark";
import { routes } from "@/lib/routes";

/** Checkout and order pages are 1160px wide in the designs (W-21 to W-30). */
export const NARROW_WRAP = "mx-auto max-w-[1160px] px-8 m:px-4";

/** Checkout header (W-21 to W-25): wordmark · Secure checkout · Back to cart. */
export function CheckoutHeader({ wrapClassName = "wrap" }: { wrapClassName?: string } = {}) {
  return (
    <header className="bg-surface shadow-[inset_0_-1px_0_var(--color-line)]">
      <div className={`${wrapClassName} flex h-[72px] items-center justify-between gap-4`}>
        <HomeLogo height={22} />
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest m:hidden">
          <Lock aria-hidden className="size-4" />
          Secure checkout
        </span>
        <Link href={routes.cart} className="inline-flex min-h-11 items-center text-sm font-semibold">
          Back to cart
        </Link>
      </div>
    </header>
  );
}

/**
 * Logo-only header with an optional link on the right (W-30, W-42a–e,
 * W-52b, W-53b, W-56, W-57, W-58).
 */
export function MinimalHeader({ right, wrapClassName = "wrap" }: { right?: ReactNode; wrapClassName?: string }) {
  return (
    <header className="bg-surface shadow-[inset_0_-1px_0_var(--color-line)]">
      <div className={`${wrapClassName} flex h-[72px] items-center justify-between gap-4`}>
        <HomeLogo height={22} />
        {right}
      </div>
    </header>
  );
}

/** System pages header (W-S1, W-S2, W-S3): wordmark · Help. */
export function SystemHeader() {
  return (
    <header className="wrap-site flex h-[88px] items-center justify-between">
      <HomeLogo height={24} />
      <Link href={routes.help} className="btn sm ghost">
        <LifeBuoy aria-hidden className="size-4" />
        Help
      </Link>
    </header>
  );
}
