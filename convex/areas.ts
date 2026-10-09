import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getViewer } from "./lib/auth";
import { looksLikeEmail } from "./lib/phone";

/** Areas Farmkeke delivers to in one state (M-06 Choose your area). */
export const listServiceAreas = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("serviceAreas")
      .withIndex("by_active_and_state_and_sortOrder", (q) =>
        q.eq("active", true).eq("state", args.state),
      )
      .take(200);
  },
});

/** States with at least one active service area (M-06 state picker). */
export const listServedStates = query({
  args: {},
  handler: async (ctx) => {
    const areas = await ctx.db
      .query("serviceAreas")
      .withIndex("by_active_and_state_and_sortOrder", (q) => q.eq("active", true))
      .take(500);
    return [...new Set(areas.map((area) => area.state))];
  },
});

/** Active pickup points, optionally limited to one state (M-37, M-07). */
export const listPickupPoints = query({
  args: { state: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const state = args.state;
    const points =
      state === undefined
        ? await ctx.db
            .query("pickupPoints")
            .withIndex("by_active_and_state", (q) => q.eq("active", true))
            .take(200)
        : await ctx.db
            .query("pickupPoints")
            .withIndex("by_active_and_state", (q) => q.eq("active", true).eq("state", state))
            .take(200);
    return await Promise.all(
      points.map(async (point) => ({
        ...point,
        photoUrl: point.photoStorageId ? await ctx.storage.getUrl(point.photoStorageId) : null,
      })),
    );
  },
});

const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

/**
 * M-05: matches the phone's position to a served area. When none covers it,
 * returns the nearest pickup point instead (M-07).
 */
export const matchLocation = query({
  args: { latitude: v.number(), longitude: v.number() },
  handler: async (ctx, args) => {
    const areas = await ctx.db
      .query("serviceAreas")
      .withIndex("by_active_and_state_and_sortOrder", (q) => q.eq("active", true))
      .take(500);
    let best: { area: (typeof areas)[number]; km: number } | null = null;
    for (const area of areas) {
      if (area.latitude === undefined || area.longitude === undefined) continue;
      const km = distanceKm(args.latitude, args.longitude, area.latitude, area.longitude);
      if (km <= (area.radiusKm ?? 5) && (best === null || km < best.km)) best = { area, km };
    }
    if (best !== null) {
      const { _id, name, state, lga } = best.area;
      return { kind: "served" as const, area: { _id, name, state, lga } };
    }
    const points = await ctx.db
      .query("pickupPoints")
      .withIndex("by_active_and_state", (q) => q.eq("active", true))
      .take(200);
    const nearest = points
      .map((p) => ({ p, km: distanceKm(args.latitude, args.longitude, p.latitude, p.longitude) }))
      .sort((a, b) => a.km - b.km)[0];
    return {
      kind: "outside" as const,
      nearestPickupPoint:
        nearest === undefined
          ? null
          : {
              _id: nearest.p._id,
              name: nearest.p.name,
              address: nearest.p.address,
              hours: nearest.p.hours,
              distanceKm: Math.round(nearest.km),
            },
    };
  },
});

/** M-07 "Notify me when available". */
export const requestArea = mutation({
  args: {
    place: v.string(),
    state: v.optional(v.string()),
    email: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!looksLikeEmail(email)) throw new ConvexError({ code: "INVALID_EMAIL" });
    const user = await getViewer(ctx);
    const recent = await ctx.db
      .query("areaRequests")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(20);
    if (recent.some((r) => r.place === args.place.trim())) return;
    await ctx.db.insert("areaRequests", {
      place: args.place.trim().slice(0, 120) || "Unknown",
      state: args.state,
      email,
      userId: user?._id,
      latitude: args.latitude,
      longitude: args.longitude,
    });
  },
});
