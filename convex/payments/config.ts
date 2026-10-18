// What the pay screens should offer (M-43 / W-24).
import { query } from "../_generated/server";
import { paymentsLive, testStepOn } from "../lib/paystack";

/** live: Paystack is set up. testStep: show "Pay (test)" (no key, or switched on). */
export const get = query({
  args: {},
  handler: async () => ({ live: paymentsLive(), testStep: testStepOn() }),
});
