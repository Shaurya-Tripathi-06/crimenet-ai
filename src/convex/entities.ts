import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { entityTypeValidator } from "./schema";

export const list = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("entities")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();
  },
});

export const get = query({
  args: { id: v.id("entities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    entityType: entityTypeValidator,
    name: v.string(),
    alias: v.optional(v.string()),
    description: v.optional(v.string()),
    investigationId: v.id("investigations"),
    documentId: v.optional(v.id("documents")),
    confidence: v.number(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    state: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    vehicleType: v.optional(v.string()),
    vehicleMake: v.optional(v.string()),
    organizationType: v.optional(v.string()),
    firNumber: v.optional(v.string()),
    policeStation: v.optional(v.string()),
    caseDate: v.optional(v.number()),
    sections: v.optional(v.string()),
    eventDate: v.optional(v.number()),
    eventLocation: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("entities", { ...args, createdAt: now });
  },
});

export const createMany = mutation({
  args: {
    entities: v.array(
      v.object({
        entityType: entityTypeValidator,
        name: v.string(),
        alias: v.optional(v.string()),
        description: v.optional(v.string()),
        investigationId: v.id("investigations"),
        documentId: v.optional(v.id("documents")),
        confidence: v.number(),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        district: v.optional(v.string()),
        state: v.optional(v.string()),
        registrationNumber: v.optional(v.string()),
        vehicleType: v.optional(v.string()),
        vehicleMake: v.optional(v.string()),
        organizationType: v.optional(v.string()),
        firNumber: v.optional(v.string()),
        policeStation: v.optional(v.string()),
        caseDate: v.optional(v.number()),
        sections: v.optional(v.string()),
        eventDate: v.optional(v.number()),
        eventLocation: v.optional(v.string()),
        metadata: v.optional(v.any()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids = [];
    for (const entity of args.entities) {
      const id = await ctx.db.insert("entities", { ...entity, createdAt: now });
      ids.push(id);
    }
    return ids;
  },
});

export const search = query({
  args: {
    query: v.string(),
    investigationId: v.optional(v.id("investigations")),
  },
  handler: async (ctx, args) => {
    const q = args.query.toLowerCase().trim();

    let allEntities;

    if (args.investigationId) {
      allEntities = await ctx.db
        .query("entities")
        .withIndex("by_investigation", (eq) =>
          eq.eq("investigationId", args.investigationId!)
        )
        .collect();
    } else {
      allEntities = await ctx.db.query("entities").collect();
    }

    // If there is no search text, return all entities
    if (!q) return allEntities;

    return allEntities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.alias && e.alias.toLowerCase().includes(q)) ||
        (e.phone && e.phone.includes(q)) ||
        (e.registrationNumber &&
          e.registrationNumber.toLowerCase().includes(q)) ||
        (e.firNumber && e.firNumber.toLowerCase().includes(q))
    );
  },
});

export const byType = query({
  args: {
    investigationId: v.id("investigations"),
    entityType: entityTypeValidator,
  },
  handler: async (ctx, args) => {
    const entities = await ctx.db
      .query("entities")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();
    return entities.filter((e) => e.entityType === args.entityType);
  },
});

export const stats = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const entities = await ctx.db
      .query("entities")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();

    const distribution: Record<string, number> = {};
    for (const e of entities) {
      distribution[e.entityType] = (distribution[e.entityType] || 0) + 1;
    }
    return { total: entities.length, distribution };
  },
});

export const globalStats = query({
  args: {},
  handler: async (ctx) => {
    const entities = await ctx.db.query("entities").collect();
    const distribution: Record<string, number> = {};
    for (const e of entities) {
      distribution[e.entityType] = (distribution[e.entityType] || 0) + 1;
    }
    return { total: entities.length, distribution };
  },
});
