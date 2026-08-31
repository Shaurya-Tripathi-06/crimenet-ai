import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const ROLES = {
  ADMIN: "admin",
  SENIOR_INVESTIGATOR: "senior_investigator",
  INVESTIGATOR: "investigator",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.SENIOR_INVESTIGATOR),
  v.literal(ROLES.INVESTIGATOR),
);

export const ENTITY_TYPES = {
  PERSON: "person",
  ORGANIZATION: "organization",
  LOCATION: "location",
  VEHICLE: "vehicle",
  PHONE: "phone",
  CASE: "case",
  EVENT: "event",
} as const;

export const entityTypeValidator = v.union(
  v.literal(ENTITY_TYPES.PERSON),
  v.literal(ENTITY_TYPES.ORGANIZATION),
  v.literal(ENTITY_TYPES.LOCATION),
  v.literal(ENTITY_TYPES.VEHICLE),
  v.literal(ENTITY_TYPES.PHONE),
  v.literal(ENTITY_TYPES.CASE),
  v.literal(ENTITY_TYPES.EVENT),
);

export const INVESTIGATION_STATUS = {
  OPEN: "open",
  UNDER_INVESTIGATION: "under_investigation",
  CLOSED: "closed",
  SUSPENDED: "suspended",
} as const;

export const INVESTIGATION_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export const SEVERITY_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
    }).index("email", ["email"]),

    investigations: defineTable({
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
      userId: v.id("users"),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"])
      .index("by_priority", ["priority"]),

    documents: defineTable({
      title: v.string(),
      content: v.string(),
      fileType: v.string(),
      investigationId: v.id("investigations"),
      userId: v.id("users"),
      processed: v.boolean(),
      createdAt: v.number(),
    }).index("by_investigation", ["investigationId"]),

    entities: defineTable({
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
      createdAt: v.number(),
    })
      .index("by_investigation", ["investigationId"])
      .index("by_type", ["entityType"])
      .index("by_name", ["name"])
      .index("by_document", ["documentId"]),

    relationships: defineTable({
      sourceId: v.id("entities"),
      targetId: v.id("entities"),
      relationshipType: v.string(),
      confidence: v.number(),
      investigationId: v.id("investigations"),
      documentId: v.optional(v.id("documents")),
      date: v.optional(v.number()),
      metadata: v.optional(v.any()),
      createdAt: v.number(),
    })
      .index("by_investigation", ["investigationId"])
      .index("by_source", ["sourceId"])
      .index("by_target", ["targetId"])
      .index("by_type", ["relationshipType"]),

    patterns: defineTable({
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
      detectedAt: v.number(),
    }).index("by_investigation", ["investigationId"]),

    aiInsights: defineTable({
      insightType: v.string(),
      content: v.string(),
      investigationId: v.id("investigations"),
      userId: v.id("users"),
      createdAt: v.number(),
    }).index("by_investigation", ["investigationId"]),

    auditLogs: defineTable({
      action: v.string(),
      entityType: v.string(),
      entityId: v.optional(v.string()),
      details: v.string(),
      userId: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_time", ["createdAt"]),

    networkMetrics: defineTable({
      investigationId: v.id("investigations"),
      entityId: v.id("entities"),
      degreeCentrality: v.number(),
      betweennessCentrality: v.number(),
      closenessCentrality: v.number(),
      pageRank: v.number(),
      community: v.number(),
      influenceScore: v.number(),
      computedAt: v.number(),
    }).index("by_investigation", ["investigationId"]),
  },
  {
    schemaValidation: false,
  }
);

export default schema;
