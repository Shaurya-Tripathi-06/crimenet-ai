import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        totalInvestigations: 0,
        activeInvestigations: 0,
        totalEntities: 0,
        persons: 0,
        organizations: 0,
        locations: 0,
        vehicles: 0,
        phones: 0,
        cases: 0,
        events: 0,
        totalRelationships: 0,
        totalPatterns: 0,
        totalDocuments: 0,
        highPriorityInvestigations: 0,
      };
    }

    const investigations = await ctx.db.query("investigations").collect();
    const entities = await ctx.db.query("entities").collect();
    const relationships = await ctx.db.query("relationships").collect();
    const patterns = await ctx.db.query("patterns").collect();
    const documents = await ctx.db.query("documents").collect();

    const activeInvestigations = investigations.filter(
      (i) => i.status === "open" || i.status === "under_investigation"
    ).length;
    const highPriorityInvestigations = investigations.filter(
      (i) => i.priority === "high" || i.priority === "critical"
    ).length;

    const persons = entities.filter((e) => e.entityType === "person").length;
    const organizations = entities.filter(
      (e) => e.entityType === "organization"
    ).length;
    const locations = entities.filter(
      (e) => e.entityType === "location"
    ).length;
    const vehicles = entities.filter(
      (e) => e.entityType === "vehicle"
    ).length;
    const phones = entities.filter((e) => e.entityType === "phone").length;
    const cases = entities.filter((e) => e.entityType === "case").length;
    const events = entities.filter((e) => e.entityType === "event").length;

    return {
      totalInvestigations: investigations.length,
      activeInvestigations,
      totalEntities: entities.length,
      persons,
      organizations,
      locations,
      vehicles,
      phones,
      cases,
      events,
      totalRelationships: relationships.length,
      totalPatterns: patterns.length,
      totalDocuments: documents.length,
      highPriorityInvestigations,
    };
  },
});

export const investigationStats = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const entities = await ctx.db
      .query("entities")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();
    const relationships = await ctx.db
      .query("relationships")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();
    const patterns = await ctx.db
      .query("patterns")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();

    const dist: Record<string, number> = {};
    for (const e of entities) {
      dist[e.entityType] = (dist[e.entityType] || 0) + 1;
    }
    const relByType: Record<string, number> = {};
    for (const r of relationships) {
      relByType[r.relationshipType] = (relByType[r.relationshipType] || 0) + 1;
    }

    return {
      totalEntities: entities.length,
      entityDistribution: dist,
      totalRelationships: relationships.length,
      relationshipDistribution: relByType,
      totalPatterns: patterns.length,
    };
  },
});

export const timelineData = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const entities = await ctx.db
      .query("entities")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();

    const timeline: Array<{
      date: number;
      type: string;
      name: string;
      details: string;
    }> = [];

    for (const e of entities) {
      if (e.caseDate) {
        timeline.push({
          date: e.caseDate,
          type: "case",
          name: e.name,
          details: e.firNumber || "Case",
        });
      }
      if (e.eventDate) {
        timeline.push({
          date: e.eventDate,
          type: "event",
          name: e.name,
          details: e.eventLocation || "Event",
        });
      }
    }

    timeline.sort((a, b) => a.date - b.date);
    return timeline;
  },
});

import { v } from "convex/values";
