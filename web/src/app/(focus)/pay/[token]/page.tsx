import type { Metadata } from "next";
import { Suspense } from "react";
import { PaySkeleton, PayView } from "../../checkout/pay/[checkoutId]/PayView";

export const metadata: Metadata = { title: "Pay your bill", robots: { index: false } };

type Props = { params: Promise<{ token: string }> };

// A delivery order's bill, from the link in its email, text or app
// notification. Works on any device; anyone with the link can pay it.
// Paystack sends the payer back here too.
export default function PayBillPage({ params }: Props) {
  return (
    <Suspense fallback={<PaySkeleton />}>
      <PayBillLoader params={params} />
    </Suspense>
  );
}

async function PayBillLoader({ params }: Props) {
  const { token } = await params;
  return <PayView payToken={token} />;
}
