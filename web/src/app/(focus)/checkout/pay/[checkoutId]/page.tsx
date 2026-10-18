import type { Metadata } from "next";
import { Suspense } from "react";
import { PaySkeleton, PayView } from "./PayView";

export const metadata: Metadata = { title: "Pay for your order", robots: { index: false } };

type Props = { params: Promise<{ checkoutId: string }> };

// W-26 Payment, W-27 Payment in progress, W-28 Payment failed and W-29
// Awaiting payment confirmation. Paystack sends the shopper back here too.
export default function PayPage({ params }: Props) {
  return (
    <Suspense fallback={<PaySkeleton />}>
      <PayLoader params={params} />
    </Suspense>
  );
}

async function PayLoader({ params }: Props) {
  const { checkoutId } = await params;
  return <PayView checkoutId={checkoutId} />;
}
