import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const patterns = await ctx.db
      .query("patterns")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();

    const enriched = await Promise.all(
      patterns.map(async (p) => {
        const entities = await Promise.all(
          p.entityIds.map(async (eid) => await ctx.db.get(eid))
        );
        return { ...p, entities };
      })
    );
    return enriched;
  },
});

export const create = mutation({
  args: {
    patternType: v.string(),
    description: v.string(),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    entityIds: v.array(v.id("entities")),
    investigationId: v.id("investigations"),
    evidence: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("patterns", {
      ...args,
      detectedAt: Date.now(),
    });
    return id;
  },
});

export const detectPatterns = mutation({
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

    const detectedPatterns: Array<{
      patternType: string;
      description: string;
      severity: "low" | "medium" | "high" | "critical";
      entityIds: string[];
      evidence: string;
    }> = [];
    // Helper to cast entity IDs
    const asEntityId = (id: string) => id as any;

    // 1. Shared Phone Number
    const phoneToEntities = new Map<string, string[]>();
    for (const e of entities) {
      if (e.phone) {
        const existing = phoneToEntities.get(e.phone) || [];
        existing.push(e._id);
        phoneToEntities.set(e.phone, existing);
      }
    }
    for (const [phone, eids] of phoneToEntities) {
      if (eids.length > 2) {
        detectedPatterns.push({
          patternType: "shared_phone",
          description: `${eids.length} entities share phone number ${phone}`,
          severity: "high",
          entityIds: eids,
          evidence: `Multiple entities linked to the same phone number ${phone}`,
        });
      }
    }

    // 2. Shared Vehicle
    const vehicleToEntities = new Map<string, string[]>();
    for (const e of entities) {
      if (e.registrationNumber) {
        const existing = vehicleToEntities.get(e.registrationNumber) || [];
        existing.push(e._id);
        vehicleToEntities.set(e.registrationNumber, existing);
      }
    }
    for (const [reg, eids] of vehicleToEntities) {
      if (eids.length > 2) {
        detectedPatterns.push({
          patternType: "shared_vehicle",
          description: `${eids.length} entities share vehicle ${reg}`,
          severity: "high",
          entityIds: eids,
          evidence: `Multiple entities linked to the same vehicle ${reg}`,
        });
      }
    }

    // 3. High Connectivity
    const connectionCount = new Map<string, number>();
    for (const r of relationships) {
      connectionCount.set(
        r.sourceId,
        (connectionCount.get(r.sourceId) || 0) + 1
      );
      connectionCount.set(
        r.targetId,
        (connectionCount.get(r.targetId) || 0) + 1
      );
    }
    const avgConnections =
      entities.length > 0
        ? Array.from(connectionCount.values()).reduce((a, b) => a + b, 0) /
          entities.length
        : 0;
    for (const [eid, count] of connectionCount) {
      if (count > avgConnections * 2 && count >= 4) {
        detectedPatterns.push({
          patternType: "high_connectivity",
          description: `Entity has ${count} connections (well above average of ${avgConnections.toFixed(1)})`,
          severity: "medium",
          entityIds: [eid],
          evidence: `Unusually high number of direct connections compared to network average`,
        });
      }
    }

    // 4. Common Intermediary
    const entityConnections = new Map<string, Set<string>>();
    for (const r of relationships) {
      if (!entityConnections.has(r.sourceId))
        entityConnections.set(r.sourceId, new Set());
      if (!entityConnections.has(r.targetId))
        entityConnections.set(r.targetId, new Set());
      entityConnections.get(r.sourceId)!.add(r.targetId);
      entityConnections.get(r.targetId)!.add(r.sourceId);
    }
    // Check entities that connect to many others that don't connect to each other
    for (const [eid, neighbors] of entityConnections) {
      let nonConnectedPairs = 0;
      const neighborArr = Array.from(neighbors);
      for (let i = 0; i < neighborArr.length; i++) {
        for (let j = i + 1; j < neighborArr.length; j++) {
          if (!entityConnections.get(neighborArr[i])?.has(neighborArr[j])) {
            nonConnectedPairs++;
          }
        }
      }
      if (nonConnectedPairs > 3) {
        const entity = entities.find((e) => e._id === eid);
        detectedPatterns.push({
          patternType: "common_intermediary",
          description: `${entity?.name || "Unknown"} connects ${nonConnectedPairs} otherwise separated pairs`,
          severity: "high",
          entityIds: [eid],
          evidence: `Entity acts as bridge between otherwise disconnected groups`,
        });
      }
    }

    // 5. Geographic Clustering
    const locationEntities = entities.filter((e) => e.entityType === "location");
    const cityEntities = new Map<string, string[]>();
    for (const loc of locationEntities) {
      if (loc.city) {
        const existing = cityEntities.get(loc.city) || [];
        existing.push(loc._id);
        cityEntities.set(loc.city, existing);
      }
    }
    // Check persons at same location
    const personLocation = new Map<string, string[]>();
    for (const e of entities) {
      if (e.entityType === "person" && e.city) {
        const existing = personLocation.get(e.city) || [];
        existing.push(e._id);
        personLocation.set(e.city, existing);
      }
    }
    for (const [city, pids] of personLocation) {
      if (pids.length >= 3) {
        detectedPatterns.push({
          patternType: "geographic_clustering",
          description: `${pids.length} persons repeatedly appearing in ${city}`,
          severity: "medium",
          entityIds: pids,
          evidence: `Multiple persons concentrated in geographic area: ${city}`,
        });
      }
    }

    // 6. Repeated Interactions
    const relPairs = new Map<string, number>();
    for (const r of relationships) {
      const key = [r.sourceId, r.targetId].sort().join("-");
      relPairs.set(key, (relPairs.get(key) || 0) + 1);
    }
    for (const [pair, count] of relPairs) {
      if (count >= 3) {
        const [id1, id2] = pair.split("-");
        detectedPatterns.push({
          patternType: "repeated_interactions",
          description: `Two entities have ${count} repeated interactions`,
          severity: "medium",
          entityIds: [id1, id2],
          evidence: `Repeated relationship pattern between two entities suggests strong ongoing connection`,
        });
      }
    }

    // 7. Organization Clustering
    const orgToPersons = new Map<string, string[]>();
    for (const r of relationships) {
      if (r.relationshipType === "associated_with") {
        const source = entities.find((e) => e._id === r.sourceId);
        const target = entities.find((e) => e._id === r.targetId);
        if (source?.entityType === "person" && target?.entityType === "organization") {
          const existing = orgToPersons.get(r.targetId) || [];
          existing.push(r.sourceId);
          orgToPersons.set(r.targetId, existing);
        }
        if (target?.entityType === "person" && source?.entityType === "organization") {
          const existing = orgToPersons.get(r.sourceId) || [];
          existing.push(r.targetId);
          orgToPersons.set(r.sourceId, existing);
        }
      }
    }
    for (const [orgId, pids] of orgToPersons) {
      if (pids.length >= 3) {
        const org = entities.find((e) => e._id === orgId);
        detectedPatterns.push({
          patternType: "organization_clustering",
          description: `${pids.length} persons connected to organization ${org?.name || "Unknown"}`,
          severity: "medium",
          entityIds: [orgId, ...pids],
          evidence: `Multiple persons associated with the same organization`,
        });
      }
    }

    // Store detected patterns
    const now = Date.now();
    const patternIds: string[] = [];
    for (const pattern of detectedPatterns) {
      const id = await ctx.db.insert("patterns", {
        patternType: pattern.patternType,
        description: pattern.description,
        severity: pattern.severity,
        entityIds: pattern.entityIds.map((eid) => eid as any),
        investigationId: args.investigationId,
        evidence: pattern.evidence,
        detectedAt: now,
      });
      patternIds.push(id);
    }
    return patternIds;
  },
});

export const clearPatterns = mutation({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const patterns = await ctx.db
      .query("patterns")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();
    for (const p of patterns) {
      await ctx.db.delete(p._id);
    }
  },
});
