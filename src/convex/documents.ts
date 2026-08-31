import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    fileType: v.string(),
    investigationId: v.id("investigations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const now = Date.now();
    const id = await ctx.db.insert("documents", {
      ...args,
      userId,
      processed: false,
      createdAt: now,
    });
    await ctx.db.insert("auditLogs", {
      action: "document_uploaded",
      entityType: "document",
      entityId: id,
      details: `Uploaded document: ${args.title}`,
      userId,
      createdAt: now,
    });
    return id;
  },
});

export const markProcessed = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { processed: true });
  },
});
