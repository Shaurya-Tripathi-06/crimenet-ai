import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const rels = await ctx.db
      .query("relationships")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();

    const enriched = await Promise.all(
      rels.map(async (r) => {
        const source = await ctx.db.get(r.sourceId);
        const target = await ctx.db.get(r.targetId);
        return { ...r, source, target };
      })
    );
    return enriched;
  },
});

export const create = mutation({
  args: {
    sourceId: v.id("entities"),
    targetId: v.id("entities"),
    relationshipType: v.string(),
    confidence: v.number(),
    investigationId: v.id("investigations"),
    documentId: v.optional(v.id("documents")),
    date: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("relationships", { ...args, createdAt: now });
  },
});

export const createMany = mutation({
  args: {
    relationships: v.array(
      v.object({
        sourceId: v.id("entities"),
        targetId: v.id("entities"),
        relationshipType: v.string(),
        confidence: v.number(),
        investigationId: v.id("investigations"),
        documentId: v.optional(v.id("documents")),
        date: v.optional(v.number()),
        metadata: v.optional(v.any()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids = [];
    for (const rel of args.relationships) {
      const id = await ctx.db.insert("relationships", {
        ...rel,
        createdAt: now,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const byEntity = query({
  args: { entityId: v.id("entities") },
  handler: async (ctx, args) => {
    const outgoing = await ctx.db
      .query("relationships")
      .withIndex("by_source", (q) => q.eq("sourceId", args.entityId))
      .collect();
    const incoming = await ctx.db
      .query("relationships")
      .withIndex("by_target", (q) => q.eq("targetId", args.entityId))
      .collect();

    const all = [...outgoing, ...incoming];
    const enriched = await Promise.all(
      all.map(async (r) => {
        const source = await ctx.db.get(r.sourceId);
        const target = await ctx.db.get(r.targetId);
        return { ...r, source, target };
      })
    );
    return enriched;
  },
});

export const stats = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const rels = await ctx.db
      .query("relationships")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();

    const byType: Record<string, number> = {};
    for (const r of rels) {
      byType[r.relationshipType] = (byType[r.relationshipType] || 0) + 1;
    }
    return { total: rels.length, byType };
  },
});

export const globalStats = query({
  args: {},
  handler: async (ctx) => {
    const rels = await ctx.db.query("relationships").collect();
    const byType: Record<string, number> = {};
    for (const r of rels) {
      byType[r.relationshipType] = (byType[r.relationshipType] || 0) + 1;
    }
    return { total: rels.length, byType };
  },
});

export const search = query({
  args: {
    query: v.string(),
    investigationId: v.optional(v.id("investigations")),
  },
  handler: async (ctx, args) => {
    const q = args.query.toLowerCase().trim();
    if (!q) return [];
    let rels;
    if (args.investigationId) {
      rels = await ctx.db
        .query("relationships")
        .withIndex("by_investigation", (eq) =>
          eq.eq("investigationId", args.investigationId!)
        )
        .collect();
    } else {
      rels = await ctx.db.query("relationships").collect();
    }
    return rels.filter(
      (r) =>
        r.relationshipType.toLowerCase().includes(q) ||
        r.sourceId === q ||
        r.targetId === q
    );
  },
});
