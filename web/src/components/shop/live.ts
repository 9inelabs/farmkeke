"use client";

// Shop pages are server-rendered without the shopper's location (the HTML is
// the same for everyone, for search engines). Once the browser knows the
// chosen area's position, islands ask the same query again with lat/lng, so
// distances appear and "Nearest farm" / "Within 5 km" work. The layout stays
// the same, so nothing jumps.
import { useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import { useSyncExternalStore } from "react";
import { area, areaPoint } from "@/lib/area";

const noop = () => () => {};

/** false during the server render and hydration, true after. */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** The chosen area and its position (undefined until known). */
export function useShopper() {
  const chosen = area.use();
  const hydrated = useHydrated();
  return { chosen: hydrated ? chosen : null, point: hydrated ? areaPoint(chosen) : undefined, hydrated };
}

export type LiveStatus = "ready" | "loading" | "needs-area";

/**
 * `initial` is the server's result for `args` without a position. When
 * `needsLocation` is true the server couldn't run the real query (distance
 * filter or Nearest sort), so `initial` is only a placeholder.
 */
export function useLive<T>(
  fn: FunctionReference<"query", "public">,
  /** The query's args without lat/lng (they must match the function's args). */
  args: Record<string, unknown>,
  initial: T,
  needsLocation = false,
): { data: T | undefined; status: LiveStatus } {
  const { point, hydrated } = useShopper();
  const live = useQuery(fn, (point ? { ...args, ...point } : "skip") as never) as T | undefined;
  if (!hydrated) return needsLocation ? { data: undefined, status: "loading" } : { data: initial, status: "ready" };
  if (!point) return needsLocation ? { data: undefined, status: "needs-area" } : { data: initial, status: "ready" };
  if (live !== undefined) return { data: live, status: "ready" };
  return needsLocation ? { data: undefined, status: "loading" } : { data: initial, status: "ready" };
}

/** "4 km" (or "800 m" under a kilometre). */
export function distanceText(km: number | null | undefined): string | undefined {
  if (km === null || km === undefined || !Number.isFinite(km)) return undefined;
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} m`;
  return `${Math.round(km)} km`;
}
