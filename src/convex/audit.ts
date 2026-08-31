import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    const logs = await ctx.db.query("auditLogs").order("desc").collect();
    return logs.slice(offset, offset + limit);
  },
});

export const log = mutation({
  args: {
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const { getAuthUserId } = await import("@convex-dev/auth/server");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("auditLogs", {
      ...args,
      userId,
      createdAt: Date.now(),
    });
  },
});
