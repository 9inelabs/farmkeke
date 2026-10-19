// Global search from the portal's top bar: an order number, an email or
// phone, a farm or a product name. Each section only appears for staff
// whose role can see it; at most 5 results per section.
import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireStaffContext } from "../lib/auth";
import { looksLikeEmail, normalizeNigerianPhone } from "../lib/phone";

export const find = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const staff = await requireStaffContext(ctx, null);
    const can = (p: string) => staff.permissions.has(p);
    const q = args.query.trim();
    const out = {
      orders: [] as { _id: string; number: string; status: string }[],
      people: [] as { _id: string; name: string; detail: string }[],
      farms: [] as { _id: string; name: string; detail: string }[],
      products: [] as { _id: string; name: string; detail: string }[],
    };
    if (q.length < 2) return out;

    const digits = q.replace(/\D/g, "");
    if (can("orders.view") && digits.length >= 3 && /^(fk-?)?\d+$/i.test(q.replace(/\s/g, ""))) {
      const order = await ctx.db
        .query("orders")
        .withIndex("by_number", (r) => r.eq("number", `FK-${digits}`))
        .first();
      if (order !== null) out.orders.push({ _id: order._id, number: order.number, status: order.status });
    }
    if (can("customers.view")) {
      if (looksLikeEmail(q)) {
        const u = await ctx.db
          .query("users")
          .withIndex("email", (r) => r.eq("email", q.toLowerCase()))
          .first();
        if (u) out.people.push({ _id: u._id, name: u.name ?? u.email ?? "Account", detail: u.email ?? "" });
      } else {
        const phone = normalizeNigerianPhone(q);
        if (phone) {
          const users = await ctx.db
            .query("users")
            .withIndex("phone", (r) => r.eq("phone", phone))
            .take(5);
          for (const u of users) out.people.push({ _id: u._id, name: u.name ?? "Account", detail: u.phone ?? "" });
        }
      }
    }
    if (can("farmers.view") && !looksLikeEmail(q)) {
      const farms = await ctx.db
        .query("farms")
        .withSearchIndex("search_name", (r) => r.search("name", q))
        .take(5);
      for (const f of farms) out.farms.push({ _id: f._id, name: f.name, detail: `${f.lga}, ${f.state}${f.status === "suspended" ? " · suspended" : ""}` });
    }
    if (can("listings.view") && !looksLikeEmail(q)) {
      const listings = await ctx.db
        .query("listings")
        .withSearchIndex("search_name", (r) => r.search("name", q))
        .take(8);
      for (const l of listings.filter((l) => l.deletedAt === undefined).slice(0, 5)) {
        const farm = await ctx.db.get("farms", l.farmId);
        out.products.push({ _id: l._id, name: l.name, detail: `${farm?.name ?? "Farm"} · ${l.status.replace(/_/g, " ")}` });
      }
    }
    return out;
  },
});
