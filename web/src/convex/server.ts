// Server-side reads for pages Google must see (shop, category, search,
// product, farm). Call these inside a "use cache" function with cacheLife,
// or inside a component wrapped in <Suspense>. Public data only: no user token.
//
//   import { cacheLife } from "next/cache";
//   export async function getProduct(id: string) {
//     "use cache";
//     cacheLife("minutes");
//     return serverQuery(api.storefront.product, { id });
//   }
import { fetchQuery } from "convex/nextjs";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";

export async function serverQuery<Q extends FunctionReference<"query">>(
  query: Q,
  args: FunctionArgs<Q>,
): Promise<FunctionReturnType<Q>> {
  return fetchQuery(query, args, { url: process.env.NEXT_PUBLIC_CONVEX_URL });
}
