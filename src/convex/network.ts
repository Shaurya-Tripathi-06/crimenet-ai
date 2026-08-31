import { v } from "convex/values";
import { query, action, mutation } from "./_generated/server";

export const graphData = query({
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

    const nodes = entities.map((e) => ({
      id: e._id,
      label: e.name,
      type: e.entityType,
      confidence: e.confidence,
      alias: e.alias,
      city: e.city,
      phone: e.phone,
      registrationNumber: e.registrationNumber,
    }));

    const edges = relationships.map((r) => ({
      id: r._id,
      source: r.sourceId,
      target: r.targetId,
      label: r.relationshipType,
      confidence: r.confidence,
    }));

    return { nodes, edges };
  },
});

export const entityConnections = query({
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
        return {
          id: r._id,
          relationship: r.relationshipType,
          confidence: r.confidence,
          sourceId: r.sourceId,
          targetId: r.targetId,
          sourceName: source?.name ?? "Unknown",
          targetName: target?.name ?? "Unknown",
          sourceType: source?.entityType ?? "unknown",
          targetType: target?.entityType ?? "unknown",
        };
      })
    );
    return enriched;
  },
});

export const getMetrics = query({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("networkMetrics")
      .withIndex("by_investigation", (q) =>
        q.eq("investigationId", args.investigationId)
      )
      .collect();
  },
});

// Compute network metrics using graph algorithms in JavaScript
export const computeMetrics = action({
  args: { investigationId: v.id("investigations") },
  handler: async (ctx, args) => {
    const graphData = await ctx.runQuery(
      ("./network" as any).graphData,
      { investigationId: args.investigationId }
    );
    if (!graphData || graphData.nodes.length === 0) return;

    const { nodes, edges } = graphData as { nodes: Array<{id: string; label: string; type: string; confidence: number}>; edges: Array<{id: string; source: string; target: string; label: string; confidence: number}> };
    const n = nodes.length;
    if (n < 2) return;

    // Build adjacency list
    const adj = new Map<string, Set<string>>();
    for (const node of nodes) {
      adj.set(node.id, new Set());
    }
    for (const edge of edges) {
      adj.get(edge.source)?.add(edge.target);
      adj.get(edge.target)?.add(edge.source);
    }

    // Degree centrality
    const degreeCentrality: Record<string, number> = {};
    const maxDegree = n - 1;
    for (const [id, neighbors] of adj) {
      degreeCentrality[id] = maxDegree > 0 ? neighbors.size / maxDegree : 0;
    }

    // BFS shortest paths for closeness centrality
    const shortestPaths = (start: string): Map<string, number> => {
      const dist = new Map<string, number>();
      const queue = [start];
      dist.set(start, 0);
      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDist = dist.get(current)!;
        for (const neighbor of adj.get(current) || []) {
          if (!dist.has(neighbor)) {
            dist.set(neighbor, currentDist + 1);
            queue.push(neighbor);
          }
        }
      }
      return dist;
    };

    // Closeness centrality
    const closenessCentrality: Record<string, number> = {};
    for (const node of nodes) {
      const dists = shortestPaths(node.id);
      let totalDist = 0;
      let reachable = 0;
      for (const [_, d] of dists) {
        if (d > 0) {
          totalDist += d;
          reachable++;
        }
      }
      closenessCentrality[node.id] =
        reachable > 0 && totalDist > 0 ? reachable / totalDist : 0;
    }

    // Betweenness centrality (simplified Brandes)
    const betweennessCentrality: Record<string, number> = {};
    for (const node of nodes) {
      betweennessCentrality[node.id] = 0;
    }
    const nodeIds = nodes.map((nd) => nd.id);
    for (const s of nodeIds) {
      const stack: string[] = [];
      const predecessors: Map<string, string[]> = new Map();
      const sigma: Record<string, number> = {};
      const delta: Record<string, number> = {};
      const d: Record<string, number> = {};

      for (const v of nodeIds) {
        sigma[v] = 0;
        delta[v] = 0;
        d[v] = -1;
      }
      sigma[s] = 1;
      d[s] = 0;

      const queue = [s];
      const visited = new Set([s]);

      while (queue.length > 0) {
        const v = queue.shift()!;
        stack.push(v);
        for (const w of adj.get(v) || []) {
          if (d[w] === -1) {
            d[w] = d[v] + 1;
            queue.push(w);
            visited.add(w);
          }
          if (d[w] === d[v] + 1) {
            sigma[w] = (sigma[w] || 0) + sigma[v];
            if (!predecessors.has(w)) predecessors.set(w, []);
            predecessors.get(w)!.push(v);
          }
        }
      }

      while (stack.length > 0) {
        const w = stack.pop()!;
        for (const v of predecessors.get(w) || []) {
          delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        }
        if (w !== s) {
          betweennessCentrality[w] =
            (betweennessCentrality[w] || 0) + delta[w];
        }
      }
    }

    // Normalize betweenness
    const maxBetweenness = Math.max(
      ...Object.values(betweennessCentrality),
      1
    );
    for (const k of Object.keys(betweennessCentrality)) {
      betweennessCentrality[k] /= maxBetweenness;
    }

    // Simple PageRank
    const pageRank: Record<string, number> = {};
    const damping = 0.85;
    const iterations = 20;
    for (const node of nodes) {
      pageRank[node.id] = 1 / n;
    }
    for (let iter = 0; iter < iterations; iter++) {
      const newPR: Record<string, number> = {};
      for (const node of nodes) {
        let sum = 0;
        for (const [id, neighbors] of adj) {
          if (neighbors.has(node.id)) {
            sum += pageRank[id] / neighbors.size;
          }
        }
        newPR[node.id] = (1 - damping) / n + damping * sum;
      }
      for (const k of Object.keys(newPR)) {
        pageRank[k] = newPR[k];
      }
    }

    // Simple connected components as communities
    const community: Record<string, number> = {};
    let communityId = 0;
    const visited = new Set<string>();
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const queue = [node.id];
        visited.add(node.id);
        while (queue.length > 0) {
          const curr = queue.shift()!;
          community[curr] = communityId;
          for (const neighbor of adj.get(curr) || []) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        communityId++;
      }
    }

    // Influence score (weighted combination)
    const maxPR = Math.max(...Object.values(pageRank), 0.001);
    const influenceScore: Record<string, number> = {};
    for (const node of nodes) {
      influenceScore[node.id] =
        0.3 * degreeCentrality[node.id] +
        0.25 * betweennessCentrality[node.id] +
        0.25 * closenessCentrality[node.id] +
        0.2 * (pageRank[node.id] / maxPR);
    }

    // Store metrics
    const now = Date.now();
    for (const node of nodes) {
      // Check if metric already exists
      const existing = await ctx.runQuery(
        ("./network" as any).getMetrics,
        { investigationId: args.investigationId }
      );
      const existingMetric = existing.find(
        (m: any) => m.entityId === node.id
      );

      const metricData = {
        investigationId: args.investigationId,
        entityId: node.id as any,
        degreeCentrality: degreeCentrality[node.id] || 0,
        betweennessCentrality: betweennessCentrality[node.id] || 0,
        closenessCentrality: closenessCentrality[node.id] || 0,
        pageRank: pageRank[node.id] || 0,
        community: community[node.id] || 0,
        influenceScore: influenceScore[node.id] || 0,
        computedAt: now,
      };

      if (existingMetric) {
        await ctx.runMutation(
          ("./network" as any).updateMetric,
          { id: existingMetric._id, ...metricData }
        );
      } else {
        await ctx.runMutation(
          ("./network" as any).insertMetric,
          metricData
        );
      }
    }
  },
});

export const insertMetric = mutation({
  args: {
    investigationId: v.id("investigations"),
    entityId: v.id("entities"),
    degreeCentrality: v.number(),
    betweennessCentrality: v.number(),
    closenessCentrality: v.number(),
    pageRank: v.number(),
    community: v.number(),
    influenceScore: v.number(),
    computedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("networkMetrics", args);
  },
});

export const updateMetric = mutation({
  args: {
    id: v.id("networkMetrics"),
    investigationId: v.id("investigations"),
    entityId: v.id("entities"),
    degreeCentrality: v.number(),
    betweennessCentrality: v.number(),
    closenessCentrality: v.number(),
    pageRank: v.number(),
    community: v.number(),
    influenceScore: v.number(),
    computedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, data);
  },
});
