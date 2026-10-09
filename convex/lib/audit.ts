import { ConvexError } from "convex/values";
import type { Id, TableNames } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/** Records a sensitive staff action (A-90). A reason is always required. */
export async function writeAudit(
  ctx: MutationCtx,
  entry: {
    actorId: Id<"users">;
    action: string;
    targetTable: TableNames;
    targetId: string;
    reason: string;
    details?: Record<string, unknown>;
  },
) {
  const reason = entry.reason.trim();
  if (reason.length === 0) throw new ConvexError("A reason is required");
  await ctx.db.insert("auditLog", {
    actorId: entry.actorId,
    action: entry.action,
    targetTable: entry.targetTable,
    targetId: entry.targetId,
    reason,
    details: entry.details === undefined ? undefined : JSON.stringify(entry.details),
  });
}
