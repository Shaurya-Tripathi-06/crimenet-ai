import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("investigations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("investigations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("under_investigation"),
      v.literal("closed"),
      v.literal("suspended")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const id = await ctx.db.insert("investigations", {
      ...args,
      userId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditLogs", {
      action: "investigation_created",
      entityType: "investigation",
      entityId: id,
      details: `Created investigation: ${args.title}`,
      userId,
      createdAt: now,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("investigations"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("under_investigation"),
        v.literal("closed"),
        v.literal("suspended")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filtered[key] = value;
    }
    filtered.updatedAt = Date.now();
    await ctx.db.patch(id, filtered);
    await ctx.db.insert("auditLogs", {
      action: "investigation_updated",
      entityType: "investigation",
      entityId: id,
      details: `Updated investigation fields: ${Object.keys(filtered).join(", ")}`,
      userId,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("investigations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.delete(args.id);
    await ctx.db.insert("auditLogs", {
      action: "investigation_deleted",
      entityType: "investigation",
      entityId: args.id,
      details: "Deleted investigation",
      userId,
      createdAt: Date.now(),
    });
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, byStatus: {}, byPriority: {} };
    const investigations = await ctx.db
      .query("investigations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    for (const inv of investigations) {
      byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
      byPriority[inv.priority] = (byPriority[inv.priority] || 0) + 1;
    }
    return { total: investigations.length, byStatus, byPriority };
  },
});
