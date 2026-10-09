import type { MutationCtx } from "../_generated/server";

/** Next value of a named counter, starting at `start`. Transactional. */
export async function nextCounter(ctx: MutationCtx, name: string, start: number): Promise<number> {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", name))
    .unique();
  if (counter === null) {
    await ctx.db.insert("counters", { name, value: start });
    return start;
  }
  const value = counter.value + 1;
  await ctx.db.patch("counters", counter._id, { value });
  return value;
}
