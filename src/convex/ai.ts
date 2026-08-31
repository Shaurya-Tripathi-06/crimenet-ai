import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing");
    return null;
  }

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(
        "Gemini API error:",
        res.status,
        errorBody
      );
      return null;
    }

    const data = await res.json();

    console.log("Gemini response received");

    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Gemini request failed:", error);
    return null;
  }
}

function extractJson(text: string): any {
  let cleaned = text.trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Try complete response
  try {
    return JSON.parse(cleaned);
  } catch {}

  // Try JSON array
  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");

  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    try {
      return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
    } catch {}
  }

  // Try JSON object
  const objectStart = cleaned.indexOf("{");
  const objectEnd = cleaned.lastIndexOf("}");

  if (objectStart !== -1 && objectEnd > objectStart) {
    try {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
    } catch {}
  }

  return null;
}

export const extractEntities = action({
  args: {
    text: v.string(),
    investigationId: v.id("investigations"),
    documentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const prompt = `Extract all entities from the following text. Return ONLY a JSON array of objects with these fields:
- entityType: one of "person", "organization", "location", "vehicle", "phone", "case", "event"
- name: the entity name
- alias: optional alias or alternate name
- description: brief description
- confidence: number between 0 and 1
- phone: phone number (for phone entities or persons)
- city: city name (for locations or persons)
- district: district (for locations)
- state: state (for locations)
- registrationNumber: vehicle registration (for vehicles)
- vehicleType: type of vehicle (for vehicles)
- vehicleMake: make/model (for vehicles)
- organizationType: type (for organizations)
- firNumber: FIR number (for cases)
- policeStation: police station (for cases)
- sections: legal sections (for cases)
- eventLocation: location of event (for events)

Text:
${args.text}

Return ONLY the JSON array, no explanation.`;

    const response = await callGemini(prompt);
    console.log("Gemini entity response:", response);
    if (!response) {
      return {
        success: false,
        error:
          "AI processing is currently unavailable. The uploaded data has been saved and can be processed again.",
        entities: [],
      };
    }

    try {
      let parsed;

      try {
        parsed = extractJson(response);
      } catch (error) {
        console.error("JSON parsing error:", error);
        console.error("Gemini response:", response);

        return {
          success: false,
          error: `Failed to parse AI response: ${
            error instanceof Error ? error.message : String(error)
          }`,
          entities: [],
        };
      }

      if (!Array.isArray(parsed)) {
        console.error("Invalid Gemini response:", response);

        return {
          success: false,
          error: "Invalid AI response format",
          entities: [],
        };
      }

      const validEntities = parsed
        .filter(
          (e: any) =>
            e.entityType &&
            e.name &&
            [
              "person",
              "organization",
              "location",
              "vehicle",
              "phone",
              "case",
              "event",
            ].includes(e.entityType)
        )
        .map((e: any) => ({
          entityType: e.entityType,
          name: e.name,
          alias: e.alias || undefined,
          description: e.description || undefined,
          confidence: Math.min(1, Math.max(0, e.confidence || 0.5)),
          investigationId: args.investigationId,
          documentId: args.documentId,
          phone: e.phone || undefined,
          city: e.city || undefined,
          district: e.district || undefined,
          state: e.state || undefined,
          registrationNumber: e.registrationNumber || undefined,
          vehicleType: e.vehicleType || undefined,
          vehicleMake: e.vehicleMake || undefined,
          organizationType: e.organizationType || undefined,
          firNumber: e.firNumber || undefined,
          policeStation: e.policeStation || undefined,
          sections: e.sections || undefined,
          eventLocation: e.eventLocation || undefined,
        }));

      return { success: true, entities: validEntities, error: null };
    } catch (e) {
      console.error("Gemini entity parsing error:", e);
      console.error("Gemini raw response:", response);

      return {
        success: false,
        error: `Failed to parse AI response: ${
          e instanceof Error ? e.message : String(e)
        }`,
          entities: [],
      };
    }
  },
});

export const extractRelationships = action({
  args: {
    text: v.string(),
    entityIds: v.array(v.id("entities")),
    investigationId: v.id("investigations"),
    documentId: v.optional(v.id("documents")),
  },

  handler: async (ctx, args) => {
    // Get entity details from Convex
    const entityDetails: Array<{
      id: string;
      name: string;
      type: string;
    }> = [];

    for (const eid of args.entityIds) {
      const entity = await ctx.runQuery(api.entities.get, {
        id: eid,
      });

      if (entity) {
        entityDetails.push({
          id: entity._id,
          name: entity.name,
          type: entity.entityType,
        });
      }
    }

    console.log("Entities available for relationship extraction:");
    console.log(JSON.stringify(entityDetails, null, 2));

    const entityList = entityDetails
      .map(
        (e) =>
          `- ${e.name} [${e.type}]`
      )
      .join("\n");

    const prompt = `
You are extracting explicit relationships from a police intelligence document.

Your job is ONLY to extract relationships that are directly stated in the document.

DO NOT infer relationships.
DO NOT use outside knowledge.
DO NOT connect people simply because they appear in the same sentence.
DO NOT create relationships that are not explicitly supported by the document.

========================
DOCUMENT
========================

${args.text}

========================
KNOWN ENTITIES
========================

These are the ONLY entities that may appear in relationships:

${entityList}

========================
RELATIONSHIP EXTRACTION
========================

Look carefully for explicit statements such as:

"Amit communicated with Raj"
=> Amit Verma -> Raj Malhotra
relationshipType: "communicated_with"

"Raj has connections with XYZ Logistics"
=> Raj Malhotra -> XYZ Logistics
relationshipType: "connected_with"

"Sanjay controls the Noida cell"
=> Sanjay Mishra -> Noida
relationshipType: "controls"

"Sanjay controls the Noida cell with help from Deepak"
=> Sanjay Mishra -> Deepak Yadav
relationshipType: "helped_by"

"Ravi met Priya"
=> Ravi Tiwari -> Priya Verma
relationshipType: "met_with"

"A meeting was held at Sector 62, Noida"
=> Meeting/Event -> Sector 62, Noida
relationshipType: "held_at"

"FIR was registered at Hazratganj PS"
=> FIR -> Hazratganj PS
relationshipType: "registered_at"

"X works for Y"
=> X -> Y
relationshipType: "works_for"

"X owns Y"
=> X -> Y
relationshipType: "owns"

"X is located in Y"
=> X -> Y
relationshipType: "located_in"

"X is associated with Y"
=> X -> Y
relationshipType: "associated_with"

========================
IMPORTANT
========================

The "source" and "target" fields MUST contain the EXACT entity names
from the KNOWN ENTITIES list.

DO NOT return Convex IDs.

If a relationship is not explicitly supported by the document, DO NOT return it.

It is better to return fewer correct relationships than invented relationships.

========================
OUTPUT FORMAT
========================

Return ONLY a valid JSON array.

Each relationship MUST have exactly these fields:

{
  "source": "Exact entity name",
  "target": "Exact entity name",
  "relationshipType": "relationship_type",
  "confidence": 0.95
}

Confidence must be between 0 and 1.

If no explicit relationships exist, return:

[]

DO NOT return markdown.
DO NOT return explanations.
DO NOT return headings.
DO NOT return prose.

RETURN ONLY JSON.
`;

    console.log("Relationship extraction prompt sent to Gemini");

    const response = await callGemini(prompt);

    console.log("Gemini relationship response:", response);

    if (!response) {
      return {
        success: false,
        error:
          "AI processing is currently unavailable. The data has been saved and can be processed again.",
        relationships: [],
      };
    }

    try {
      const parsed = extractJson(response);

      console.log(
        "Parsed relationship response:",
        JSON.stringify(parsed, null, 2)
      );

      if (!Array.isArray(parsed)) {
        console.error("Relationship response was not an array");

        return {
          success: false,
          error: "Invalid AI response format",
          relationships: [],
        };
      }

      // Map entity names -> Convex IDs
      const entityMap = new Map<string, string>();

      for (const entity of entityDetails) {
        entityMap.set(entity.name.toLowerCase().trim(), entity.id);
      }

      console.log(
        "Entity name map:",
        JSON.stringify(
          Object.fromEntries(entityMap),
          null,
          2
        )
      );

      const validRelationships = parsed
        .filter((r: any) => {
          if (
            !r ||
            !r.source ||
            !r.target ||
            !r.relationshipType
          ) {
            console.warn("Rejected relationship: missing fields", r);
            return false;
          }

          const sourceId = entityMap.get(
            String(r.source).toLowerCase().trim()
          );

          const targetId = entityMap.get(
            String(r.target).toLowerCase().trim()
          );

          if (!sourceId) {
            console.warn(
              "Rejected relationship: source entity not found:",
              r.source
            );
            return false;
          }

          if (!targetId) {
            console.warn(
              "Rejected relationship: target entity not found:",
              r.target
            );
            return false;
          }

          if (sourceId === targetId) {
            console.warn(
              "Rejected self relationship:",
              r
            );
            return false;
          }

          return true;
        })
        .map((r: any) => {
          const sourceId = entityMap.get(
            String(r.source).toLowerCase().trim()
          )!;

          const targetId = entityMap.get(
            String(r.target).toLowerCase().trim()
          )!;

          return {
            sourceId: sourceId as any,
            targetId: targetId as any,
            relationshipType: String(r.relationshipType),
            confidence: Math.min(
              1,
              Math.max(
                0,
                Number(r.confidence) || 0.5
              )
            ),
            investigationId: args.investigationId,
            documentId: args.documentId,
          };
        });

      console.log(
        `Valid relationships: ${validRelationships.length}`
      );

      console.log(
        "Final relationships:",
        JSON.stringify(validRelationships, null, 2)
      );

      return {
        success: true,
        relationships: validRelationships,
        error: null,
      };
    } catch (error) {
      console.error(
        "Relationship parsing error:",
        error
      );

      console.error(
        "Raw Gemini relationship response:",
        response
      );

      return {
        success: false,
        error: "Failed to parse AI relationship response",
        relationships: [],
      };
    }
  },
});

export const generateInsight = action({
  args: {
    investigationId: v.id("investigations"),
    context: v.string(),
    question: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    // Fetch actual investigation data from Convex
    const entities = await ctx.runQuery(
      api.entities.list,
      {
        investigationId: args.investigationId,
      }
    );

    const relationships = await ctx.runQuery(
      api.relationships.list,
      {
        investigationId: args.investigationId,
      }
    );

    const documents = await ctx.runQuery(
      api.documents.list,
      {
        investigationId: args.investigationId,
      }
    );
    // Find phone numbers associated with multiple entities
    const phoneMap = new Map<string, string[]>();

    for (const entity of entities) {
      if (!entity.phone) continue;

      const phone = entity.phone.trim();

      if (!phoneMap.has(phone)) {
        phoneMap.set(phone, []);
      }

      phoneMap.get(phone)!.push(entity.name);
    }

    const sharedPhones = Array.from(phoneMap.entries())
      .filter(([_, names]) => names.length > 1)
      .map(([phone, names]) => ({
        phone,
        entities: names,
      }));

    const sharedPhoneContext =
      sharedPhones.length > 0
        ? sharedPhones
            .map(
              (item) =>
                `Phone: ${item.phone}\nEntities: ${item.entities.join(", ")}`
            )
            .join("\n---\n")
        : "No shared phone numbers found.";

    // Convert database records into readable AI context
    const entityContext = entities
      .map((e) => {
        return `
Entity ID: ${e._id}
Type: ${e.entityType}
Name: ${e.name}
Alias: ${e.alias || "N/A"}
Description: ${e.description || "N/A"}
Phone: ${e.phone || "N/A"}
City: ${e.city || "N/A"}
District: ${e.district || "N/A"}
State: ${e.state || "N/A"}
Registration Number: ${e.registrationNumber || "N/A"}
Organization Type: ${e.organizationType || "N/A"}
FIR Number: ${e.firNumber || "N/A"}
Police Station: ${e.policeStation || "N/A"}
Sections: ${e.sections || "N/A"}
Confidence: ${e.confidence}
`;
      })
      .join("\n---\n");

    const relationshipContext = relationships
      .map((r) => {
        return `
Source: ${r.source?.name || r.sourceId}
Source Type: ${r.source?.entityType || "unknown"}
Relationship: ${r.relationshipType}
Target: ${r.target?.name || r.targetId}
Target Type: ${r.target?.entityType || "unknown"}
Confidence: ${r.confidence}
`;
      })
      .join("\n---\n");

    const documentContext = documents
      .map((d) => {
        return `
Document: ${d.title}
Type: ${d.fileType}
Content:
${d.content}
`;
      })
      .join("\n---\n");

    const prompt = `You are an AI crime analysis assistant for UP Police.

You are analyzing a specific investigation using VERIFIED DATABASE RECORDS provided below.

IMPORTANT RULES:
1. Use the database records below to answer the user's question.
2. Do not claim that data is missing if the relevant information exists in the database records.
3. Do not invent people, phone numbers, relationships, organizations, locations, cases, or other facts.
4. Clearly distinguish verified database information from AI-generated interpretation.
5. If the database genuinely does not contain enough information to answer the question, say:
"Insufficient data available in the investigation database."
6. Treat confidence values as confidence scores, not proof of guilt.
7. This is synthetic/demo investigation data and must not be presented as verified real-world criminal findings.

USER QUESTION:
${args.question || args.context}

========================
DATABASE ENTITIES
========================

${entityContext || "No entities found."}

========================
DATABASE RELATIONSHIPS
========================

${relationshipContext || "No relationships found."}

========================
DATABASE DOCUMENTS
========================

${documentContext || "No documents found."}

========================
SHARED PHONE NUMBERS
========================

${sharedPhoneContext}

========================
ANALYSIS
========================

Provide a concise but useful answer to the user's question.

Start your response with:

AI-GENERATED ANALYSIS

Then include:

### Verified Database Information

List the relevant facts directly supported by the database.

### Analysis

Explain what those facts indicate in relation to the user's question.

If appropriate, mention the relevant entity names, phone numbers, relationships, locations, FIRs, or organizations.

Do not mention CDRs unless CDR data actually exists in the database.
`;

    const response = await callGemini(prompt);

    if (!response) {
      return {
        success: false,
        error:
          "AI processing is currently unavailable. The data has been saved and can be processed again.",
        insight: null,
      };
    }

    const userId = await getAuthUserId(ctx);

    if (userId) {
      await ctx.runMutation(
        internal.insights.create,
        {
          insightType: args.question ? "chat_response" : "auto_insight",
          content: response,
          investigationId: args.investigationId,
          userId,
        }
      );
    }

    return {
      success: true,
      insight: response,
      error: null,
    };
  },
});

export const generateSummary = action({
  args: {
    investigationId: v.id("investigations"),
    context: v.string(),
  },
  handler: async (ctx, args) => {
    const prompt = `You are an AI crime analysis assistant for UP Police. Generate a comprehensive investigation summary report based on the following structured data.

Include these sections:
1. Executive Summary
2. Key Entities
3. Network Structure
4. Suspicious Patterns
5. Important Locations
6. Important Relationships
7. Analytical Leads

Clearly distinguish verified database information from AI-generated interpretation.
Label your response "AI-GENERATED INVESTIGATION SUMMARY".

Data:
${args.context}`;

    const response = await callGemini(prompt);
    if (!response) {
      return {
        success: false,
        error:
          "AI processing is currently unavailable. Please try again later.",
        summary: null,
      };
    }

    const userId = await getAuthUserId(ctx);
    if (userId) {
      await ctx.runMutation(
        internal.insights.create,
        {
          insightType: "investigation_summary",
          content: response,
          investigationId: args.investigationId,
          userId,
        }
      );
    }

    return { success: true, summary: response, error: null };
  },
});

export const checkAvailability = action({
  args: {},
  handler: async () => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "GEMINI_API_KEY is not configured in Convex",
      };
    }

    try {
      const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say OK" }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });

      const body = await res.text();

      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          error: body,
        };
      }

      return {
        success: true,
        status: res.status,
        response: body,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
