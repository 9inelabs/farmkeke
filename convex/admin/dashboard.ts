// A-10 Dashboard: today's numbers and the last 7 days, for staff who can
// see the dashboard. `dayStart` is the client's local midnight (queries
// don't read the clock). Reads at most 5,000 orders from the last 7 days.
import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireStaff } from "../lib/auth";
import type { OrderStatus } from "../lib/orders";
import { DAY } from "../lib/settings";


export const stats = query({
  args: { dayStart: v.number() },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "dashboard.view");
    const weekStart = args.dayStart - 6 * DAY;
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", weekStart))
      .take(5000);
    const days = Array.from({ length: 7 }, (_, i) => ({ dayStart: weekStart + i * DAY, orders: 0, salesKobo: 0 }));
    let todayOrders = 0;
    let todaySalesKobo = 0;
    let todayDelivery = 0;
    let todayPickup = 0;
    for (const o of orders) {
      // Paid orders only (unpaid delivery orders count once their bill is paid)
      if (o.paidAt === undefined) continue;
      const i = Math.floor((o._creationTime - weekStart) / DAY);
      if (i < 0 || i > 6) continue;
      days[i].orders++;
      days[i].salesKobo += o.totalKobo;
      if (i === 6) {
        todayOrders++;
        todaySalesKobo += o.totalKobo;
        if (o.fulfilment === "delivery") todayDelivery++;
        else todayPickup++;
      }
    }
    const newAccounts = await ctx.db
      .query("users")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", args.dayStart))
      .take(1000);
    const active = async (status: OrderStatus) =>
      (await ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", status)).take(500)).length;
    // Paid pickup orders and unpaid delivery orders both wait for the farm
    const waitingForFarms = (await active("paid")) + (await active("placed"));
    const inProgress =
      (await active("accepted")) + (await active("preparing")) + (await active("ready_for_rider"));
    const onTheRoad =
      (await active("out_for_delivery")) +
      (await active("with_rider")) +
      (await active("at_pickup_point")) +
      (await active("ready_for_collection"));
    const farms = await ctx.db.query("farms").withIndex("by_status", (q) => q.eq("status", "active")).take(1000);
    const live = await ctx.db.query("listings").withIndex("by_status_and_submittedAt", (q) => q.eq("status", "live")).take(2000);
    return {
      today: {
        orders: todayOrders,
        salesKobo: todaySalesKobo,
        delivery: todayDelivery,
        pickup: todayPickup,
        newAccounts: newAccounts.filter((u) => !u.isAnonymous).length,
      },
      week: days,
      pipeline: { waitingForFarms, inProgress, onTheRoad },
      catalog: { activeFarms: farms.length, liveProducts: live.filter((l) => l.deletedAt === undefined).length },
      capped: orders.length === 5000,
    };
  },
});
