// Return shapes for the portal's customer-care screens (convex/admin/
// consumers.ts, disputes.ts, support.ts, chat.ts).
import type { Id } from "../api";
import type { OrderDetail, OrderRow } from "./adminOps";

export type AccountRow = {
  _id: Id<"users">;
  _creationTime: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  isGuest: boolean;
  isStaff: boolean;
  farm: { _id: Id<"farms">; name: string } | null;
  blocked: boolean;
};

export type AccountDetail = {
  user: { _id: Id<"users">; blockedAt?: number; blockReason?: string };
  account: AccountRow;
  addresses: { _id: string; label: string; street: string; landmark: string; areaName?: string; lga?: string; state?: string }[];
  activity: { _id: string; _creationTime: number; action: string; reason: string; actorId: Id<"users"> }[];
  orders: Omit<OrderRow, "consumerName" | "consumerPhone" | "escrowHold" | "riderId" | "disputeId" | "unconfirmedFlaggedAt">[];
  signedInDevices: number;
};

export type DeletionRow = { _id: string; _creationTime: number; userId: string; status: "completed" | "waiting_for_orders"; completedAt?: number };

export type DisputeStatus = "open" | "farmer_responded" | "resolved";

export type DisputeRow = {
  _id: Id<"disputes">;
  number: string;
  orderId: Id<"orders">;
  orderNumber: string;
  farmName: string;
  consumerName: string;
  reasonLabel: string;
  amountKobo: number;
  status: DisputeStatus;
  outcome: "released" | "refunded" | "split" | null;
  reportedAt: number;
  farmReplyBy: number;
  farmReplyOverdue: boolean;
  decideBy: number;
  lastMessageAt: number;
  unread: boolean;
  farmResponded: boolean;
  assignee: { _id: Id<"users">; name: string } | null;
};

export type DisputeMessage = {
  _id: string;
  from: "consumer" | "farmer" | "staff";
  audience: "consumer" | "farmer" | null;
  mine: boolean;
  authorName: string | null;
  body: string;
  photos: string[];
  at: number;
};

export type DisputeDetail = {
  _id: Id<"disputes">;
  number: string;
  orderId: Id<"orders">;
  orderNumber: string;
  farmName: string;
  reasonLabel: string;
  items: { index: number; name: string; quantity: number; unitLabel: string; lineTotalKobo: number }[];
  note: string;
  photos: string[];
  amountKobo: number;
  status: DisputeStatus;
  reportedAt: number;
  farmReplyBy: number;
  farmReplyOverdue: boolean;
  decideBy: number;
  farmResponse: { at: number; note: string; photos: string[] } | null;
  decision: { outcome: "released" | "refunded" | "split"; refundKobo: number; releaseKobo: number; note: string; at: number | null } | null;
  heldKobo: number;
  deliveryFeeKobo: number;
  itemsTotalKobo: number;
  messages: DisputeMessage[];
  order: Pick<OrderDetail, "status" | "totalKobo" | "fulfilment"> | null;
  escrowHold: boolean;
  consumer: { name: string; phone: string | null; email: string | null; isGuest: boolean };
  farm: { _id: Id<"farms">; name: string; phone: string } | null;
  assignee: { _id: Id<"users">; name: string } | null;
  decidedBy: { _id: Id<"users">; name: string } | null;
  notes: { _id: string; body: string; at: number; authorName: string }[];
};

export type TicketRow = {
  _id: Id<"supportTickets">;
  number: string | null;
  side: "shop" | "farm";
  status: "open" | "resolved";
  order: { orderId: Id<"orders">; number: string } | null;
  preview: string | null;
  createdAt: number;
  lastMessageAt: number;
  resolvedAt: number | null;
  unread: boolean;
  from: { name: string | null; email: string | null; isGuest: boolean; userId?: Id<"users">; phone?: string | null; farm?: { _id: Id<"farms">; name: string } | null };
  assignee: { _id: Id<"users">; name: string } | null;
};

export type SupportMessage = { _id: string; from: "user" | "staff"; mine: boolean; authorName: string | null; body: string; photos: string[]; at: number };

export type ChatInfo = {
  orderId: Id<"orders">;
  number: string;
  status: string;
  conversationId: Id<"conversations"> | null;
  shopper: { name: string; phone: string };
  farm: { _id: Id<"farms">; name: string; phone: string } | null;
  lastMessageAt: number | null;
  consumerUnread: number;
  farmerUnread: number;
};

export type ChatMessage = { _id: string; side: "shop" | "farm"; body: string; photos: string[]; at: number };

export type Assignable = { userId: Id<"users">; name: string };
