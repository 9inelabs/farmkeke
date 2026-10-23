// M-43 to M-46 for a pickup checkout, and where Paystack sends the shopper
// back to the app (farmkeke://checkout/pay/<id>?reference=…).
import { useLocalSearchParams } from "expo-router";
import { PayFlow } from "@/features/checkout/PayFlow";

export default function PayCheckout() {
  const params = useLocalSearchParams<{ checkoutId: string; reference?: string; trxref?: string }>();
  return <PayFlow checkoutId={params.checkoutId} returned={!!(params.reference || params.trxref)} />;
}
