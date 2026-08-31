import { v } from "convex/values";
import { query } from "./_generated/server";

export const global = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const q = args.query.toLowerCase().trim();
    if (!q) return { entities: [], investigations: [], relationships: [] };

    const entities = await ctx.db.query("entities").collect();
    const investigations = await ctx.db.query("investigations").collect();
    const relationships = await ctx.db.query("relationships").collect();

    const matchedEntities = entities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.alias && e.alias.toLowerCase().includes(q)) ||
        (e.phone && e.phone.includes(q)) ||
        (e.registrationNumber &&
          e.registrationNumber.toLowerCase().includes(q)) ||
        (e.firNumber && e.firNumber.toLowerCase().includes(q))
    );

    const matchedInvestigations = investigations.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)
    );

    return {
      entities: matchedEntities.slice(0, 20),
      investigations: matchedInvestigations.slice(0, 10),
      relationships: [],
    };
  },
});
