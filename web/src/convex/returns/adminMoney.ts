// Return shapes for the portal's money screens (convex/admin/ledger.ts and
// convex/admin/payments.ts).
import type { Id } from "../api";

export type LedgerRow = {
  orderId: Id<"orders">;
  number: string;
  status: string;
  escrow: string;
  escrowHold: boolean;
  holdReason: string | null;
  farmId: Id<"farms">;
  farmName: string;
  consumerName: string;
  amountKobo: number;
  itemsTotalKobo: number;
  deliveryFeeKobo: number;
  heldSince: number | null;
  deliveredAt: number | null;
  confirmedAt: number | null;
  releasedAt: number | null;
  unconfirmedFlaggedAt: number | null;
  disputeId: Id<"disputes"> | null;
};

export type ReleaseQueue = { confirmed: LedgerRow[]; unconfirmed: LedgerRow[]; disputed: LedgerRow[] };

export type MoneySummary = {
  heldKobo: number;
  heldOrders: number;
  onHold: number;
  toRelease: number;
  unconfirmed: number;
  pendingPayoutKobo: number;
  failedPayouts: number;
  failedRefunds: number;
  capped: boolean;
};

export type LedgerEntry = {
  _id: string;
  at: number;
  kind: "hold" | "release" | "commission" | "delivery_fee" | "refund" | "payout";
  amountKobo: number;
  status: string;
  note: string | null;
  simulated: boolean;
  refundId: string | null;
  payoutId: string | null;
  actorName: string | null;
};

export type PayoutRow = {
  _id: Id<"payouts">;
  farmId: Id<"farms">;
  farmName: string;
  amountKobo: number;
  status: "pending" | "sent" | "failed";
  reference: string;
  provider: string;
  simulated: boolean;
  sending: boolean;
  transferCode: string | null;
  bankName: string;
  accountLast4: string;
  failureReason: string | null;
  attempts: number;
  createdAt: number;
  sentAt: number | null;
  orderCount: number;
};

export type PayoutDetail = PayoutRow & {
  recipientCode: string | null;
  items: { orderId: Id<"orders">; orderNumber: string; itemsTotalKobo: number; commissionKobo: number; amountKobo: number }[];
  ledger: { _id: string; kind: string; amountKobo: number; status: string; at: number }[];
};

export type RefundRow = {
  _id: Id<"refunds">;
  orderId: Id<"orders">;
  orderNumber: string;
  consumerName: string;
  amountKobo: number;
  kind: "full" | "part";
  reason: string;
  status: "queued" | "sending" | "processing" | "processed" | "failed";
  provider: string;
  simulated: boolean;
  transactionReference: string;
  providerRefundId: string | null;
  providerStatus: string | null;
  failureReason: string | null;
  attempts: number;
  createdAt: number;
  sentAt: number | null;
  expectedAt: number | null;
  settledAt: number | null;
  disputeId: Id<"disputes"> | null;
};

export type Reconciliation = {
  live: boolean;
  mismatches: {
    _id: Id<"paymentAttempts">;
    reference: string;
    checkoutReference: string | null;
    checkoutStatus: string | null;
    expectedKobo: number;
    paidKobo: number | null;
    currency: string;
    provider: string;
    paidAt: number | null;
    failureReason: string | null;
  }[];
  unmatched: { _id: Id<"unmatchedPaymentEvents">; event: string; reference: string; amountKobo: number | null; status: string | null; at: number }[];
  failedRefundCount: number;
  failedPayoutCount: number;
};

export type BankCheck = {
  live: boolean;
  checked: number;
  missing: { code: string; name: string }[];
  renamed: { code: string; ours: string; paystack: string }[];
  paystackCount: number;
};
