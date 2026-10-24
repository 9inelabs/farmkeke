// Links into the app while it's running. Paystack's return link is the
// in-app payment's own answer, handled by PayFlow, so it doesn't open a
// screen of its own while that payment is in progress. Every other link,
// and any link that launches the app, goes through as it is.
import { isPayReturn, paySession } from "@/features/checkout/paySession";

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    if (!initial && paySession.open && isPayReturn(path)) return null;
  } catch {
    // Never block a link over this check
  }
  return path;
}
