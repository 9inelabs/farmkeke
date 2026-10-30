// Admin → Messages (admin/messages.ts) return shapes.
import type { Id } from "../api";

export type MessageSide = "shop" | "farm" | "both";
export type MessageLinkTo = "message" | "home" | "orders" | "product" | "farm" | "category" | "dashboard" | "listings" | "sales" | "earnings";

export type MessageRow = {
  _id: Id<"broadcasts">;
  side: MessageSide;
  audience: "everyone" | "one";
  recipient: string | null;
  kind: "update" | "offer";
  title: string;
  body: string;
  link: { to: MessageLinkTo; id?: string };
  status: "scheduled" | "sending" | "sent" | "cancelled" | "withdrawn";
  sendAt: number;
  sentAt: number | null;
  sentBy: string;
  recipients: number;
};

export type MessageReach = {
  people: number;
  withPush: number;
  /** More than the 5,000 counted */
  capped: boolean;
  person: { name: string | null; phone: string | null; email: string | null } | null;
};
