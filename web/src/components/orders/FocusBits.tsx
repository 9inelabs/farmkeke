"use client";

// Small pieces for the single-purpose order pages (W-52b, W-53b, W-56, W-57,
// W-58): the header's "My orders" link and a not-found card.
import Link from "next/link";
import { AuthCard } from "@/components/account/AuthLayouts";
import { HomeLogo } from "@/components/brand/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";

/** "My orders" for accounts, the order itself for guests. */
export function OrdersLink({ orderId }: { orderId: string }) {
  const { status } = useViewer();
  return (
    <Link href={status === "signed-in" ? routes.myOrders : routes.order(orderId)} className="inline-flex min-h-11 items-center text-sm font-semibold">
      {status === "signed-in" ? "My orders" : "Your order"}
    </Link>
  );
}

export function FocusSkeleton({ orderId, width = 540 }: { orderId: string; width?: number }) {
  return (
    <AuthCard width={width} top={64} padding="40px 36px" center headerRight={<OrdersLink orderId={orderId} />}>
      <Skeleton className="mx-auto size-[76px]" rounded={999} />
      <Skeleton className="mx-auto mt-6 h-9 w-3/4" />
      <Skeleton className="mx-auto mt-3 h-5 w-full" />
      <Skeleton className="mt-6 h-[120px] w-full" rounded={16} />
    </AuthCard>
  );
}

export function FocusMissing({ orderId }: { orderId: string }) {
  return (
    <AuthCard width={540} top={64} padding="40px 36px" center headerRight={<OrdersLink orderId={orderId} />}>
      <h1 className="m-0 font-display text-[26px] leading-[34px] font-extrabold m:text-[22px] m:leading-7">We couldn&apos;t open this order</h1>
      <p className="p mt-2">It may belong to another account or device. Find it with your order number and phone number.</p>
      <ButtonLink href={routes.findOrder} variant="lime" className="mt-6">
        Find my order
      </ButtonLink>
    </AuthCard>
  );
}

/** Header and a centred column, for W-56, W-57 and W-58. */
export function FocusShell({
  orderId,
  width,
  children,
  className = "flex flex-col gap-[18px] px-5 pt-8 pb-16",
}: {
  orderId: string;
  width: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex h-[76px] items-center justify-between gap-4 bg-surface px-10 shadow-[inset_0_-1px_0_var(--color-line)] m:px-4">
        <HomeLogo height={22} />
        <OrdersLink orderId={orderId} />
      </header>
      <main id="main" tabIndex={-1} className={`mx-auto outline-none ${className}`} style={{ maxWidth: width }}>
        {children}
      </main>
    </div>
  );
}
