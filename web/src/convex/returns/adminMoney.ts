// Return shapes for the portal's money screens (convex/admin/money.ts,
// convex/admin/ledger.ts and convex/admin/payments.ts).
import type { Id } from "../api";

export type MoneyOverview = {
  payments: number;
  collectedKobo: number;
  farmSharesKobo: number;
  commissionKobo: number;
  deliveryKobo: number;
  recoveredKobo: number;
  refundsOpen: number;
  refundsOpenKobo: number;
  refundsFailed: number;
  farmsOwing: number;
  owedKobo: number;
  farmsNotReady: number;
  farmsWithProblem: number;
  live: boolean;
  capped: boolean;
};

export type PaymentRow = {
  _id: string;
  reference: string;
  checkoutReference: string;
  shopperName: string;
  paidAt: number;
  amountKobo: number;
  channel: string | null;
  simulated: boolean;
  splitCode: string | null;
  parts: { orderId: Id<"orders">; orderNumber: string; farmId: Id<"farms">; farmName: string; shareKobo: number; commissionKobo: number; recoveredKobo: number }[];
  farmkekeKobo: number;
  firstOrderId: Id<"orders"> | null;
};

export type MoneyFarmRow = {
  farmId: Id<"farms">;
  name: string;
  owedKobo: number;
  paystack: "ready" | "setting_up" | "problem" | "test";
  subaccountCode: string | null;
  subaccountError: string | null;
  syncedAt: number | null;
  bankName: string;
  accountLast4: string;
  accountName: string;
};

export type LedgerEntry = {
  _id: string;
  at: number;
  kind: "farm_share" | "commission" | "delivery_fee" | "debt_recovered" | "refund" | "farm_debt" | string;
  amountKobo: number;
  status: string;
  note: string | null;
  simulated: boolean;
  refundId: string | null;
  actorName: string | null;
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
  /** What the farm owes back for this refund */
  farmDebtKobo: number;
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
};

export type BankCheck = {
  live: boolean;
  checked: number;
  missing: { code: string; name: string }[];
  renamed: { code: string; ours: string; paystack: string }[];
  paystackCount: number;
};
