// Paying a delivery bill: from the order screen, or from the bill's link
// (farmkeke://pay/<token>) on any phone. Paystack sends the payer back here
// with ?reference=….
import { useLocalSearchParams } from "expo-router";
import { PayFlow } from "@/features/checkout/PayFlow";

export default function PayBill() {
  const params = useLocalSearchParams<{ token: string; reference?: string; trxref?: string }>();
  return <PayFlow payToken={params.token} returned={!!(params.reference || params.trxref)} />;
}
