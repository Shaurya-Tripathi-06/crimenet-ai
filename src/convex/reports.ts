import { v } from "convex/values";
import { query } from "./_generated/server";

export const generate = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const investigation = await ctx.db.get(args.investigationId);
    if (!investigation) return null;

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
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();
    const metrics = await ctx.db
      .query("networkMetrics")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();

    // Build entity type distribution
    const entityDist: Record<string, number> = {};
    for (const e of entities) {
      entityDist[e.entityType] = (entityDist[e.entityType] || 0) + 1;
    }

    // Build relationship type distribution
    const relDist: Record<string, number> = {};
    for (const r of relationships) {
      relDist[r.relationshipType] = (relDist[r.relationshipType] || 0) + 1;
    }

    // Top entities by influence
    const topEntities = metrics
      .sort((a, b) => b.influenceScore - a.influenceScore)
      .slice(0, 5)
      .map((m) => {
        const entity = entities.find((e) => e._id === m.entityId);
        return {
          name: entity?.name || "Unknown",
          type: entity?.entityType || "unknown",
          influenceScore: m.influenceScore,
          degreeCentrality: m.degreeCentrality,
          betweennessCentrality: m.betweennessCentrality,
        };
      });

    return {
      investigation: {
        title: investigation.title,
        description: investigation.description,
        status: investigation.status,
        priority: investigation.priority,
        createdAt: investigation.createdAt,
        updatedAt: investigation.updatedAt,
      },
      statistics: {
        totalEntities: entities.length,
        entityDistribution: entityDist,
        totalRelationships: relationships.length,
        relationshipDistribution: relDist,
        totalPatterns: patterns.length,
        totalDocuments: documents.length,
      },
      topEntities,
      patterns: patterns.map((p) => ({
        type: p.patternType,
        description: p.description,
        severity: p.severity,
        evidence: p.evidence,
      })),
      generatedAt: Date.now(),
    };
  },
});
