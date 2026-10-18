// Safety-net sweeps behind the per-order scheduled jobs (A-85).
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 24h accept deadline (each order also has its own scheduled expiry)
crons.interval("expire unanswered orders", { minutes: 15 }, internal.orders.system.expireUnanswered, {});
// "Deadline near" reminder to farms
crons.interval("remind farmers to respond", { minutes: 30 }, internal.orders.system.remindFarmers, {});
// Unconfirmed a day after delivery, and pickup orders past their 3 days
crons.interval("flag unconfirmed and overdue orders", { hours: 1 }, internal.orders.system.flagUnconfirmed, {});
// Unpaid checkouts give their stock back after an hour
crons.interval("abandon unpaid checkouts", { minutes: 15 }, internal.checkout.abandonStale, { olderThanMinutes: 60 });
// Refunds and payouts whose send never ran
crons.interval("resend stuck refunds and payouts", { minutes: 10 }, internal.payments.processor.run, {});

export default crons;
