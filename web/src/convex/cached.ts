// Cached server reads shared by layouts. Public catalogue data changes rarely.
import { cacheLife } from "next/cache";
import { api } from "./api";
import type { Category } from "./returns/common";
import { serverQuery } from "./server";

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  try {
    const all = (await serverQuery(api.catalog.listCategories, {})) as Category[];
    return all.filter((c) => !c.hidden).sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    // The header still renders (without the category bar) if Convex is unreachable.
    return [];
  }
}
