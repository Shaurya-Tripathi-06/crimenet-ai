import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

export const list = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiInsights")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .order("desc")
      .collect();
  },
});

export const create = internalMutation({
  args: {
    insightType: v.string(),
    content: v.string(),
    investigationId: v.id("investigations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiInsights", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
