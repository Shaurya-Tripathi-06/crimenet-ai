import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Clear all data
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    //const userId = await getAuthUserId(ctx);
    //if (!userId) throw new Error("Not authenticated");

    // Delete all data in order (respecting foreign keys)
    const collections = [
      "auditLogs",
      "aiInsights",
      "patterns",
      "networkMetrics",
      "relationships",
      "entities",
      "documents",
      "investigations",
    ] as const;

    for (const collection of collections) {
      const docs = await ctx.db.query(collection).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }
    return true;
  },
});

// Load comprehensive synthetic demo dataset
// Load synthetic demo dataset with multiple investigations
export const loadDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    // Helper for creating an investigation with its own small network
    const createInvestigation = async ({
      title,
      description,
      priority,
      documentTitle,
      documentContent,
      entities,
      relationships,
    }: {
      title: string;
      description: string;
      priority: string;
      documentTitle: string;
      documentContent: string;
      entities: any[];
      relationships: {
        source: string;
        target: string;
        type: string;
        confidence: number;
      }[];
    }) => {
      // 1. Investigation
      const investigationId = await ctx.db.insert("investigations", {
        title,
        description: `${description} SYNTHETIC DEMO DATA — FOR DEMONSTRATION ONLY.`,
        status: "under_investigation",
        priority: priority as "low" | "medium" | "high" | "critical",
        userId,
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });

      // 2. Document
      const documentId = await ctx.db.insert("documents", {
        title: documentTitle,
        content: documentContent,
        fileType: "text",
        investigationId,
        userId,
        processed: true,
        createdAt: now - 25 * 24 * 60 * 60 * 1000,
      });

      // 3. Create entities and keep their IDs by name
      const ids: Record<string, any> = {};

      for (const entity of entities) {
        const id = await ctx.db.insert("entities", {
          ...entity,
          investigationId,
          documentId,
          createdAt: now - 20 * 24 * 60 * 60 * 1000,
        });

        ids[entity.key] = id;
      }

      // 4. Create relationships
      for (const relationship of relationships) {
        await ctx.db.insert("relationships", {
          sourceId: ids[relationship.source],
          targetId: ids[relationship.target],
          relationshipType: relationship.type,
          confidence: relationship.confidence,
          investigationId,
          documentId,
          createdAt: now - 15 * 24 * 60 * 60 * 1000,
        });
      }

      return {
        investigationId,
        entityCount: entities.length,
        relationshipCount: relationships.length,
      };
    };

    // =========================================================
    // INVESTIGATION 1
    // OPERATION BLACK NET — INTERSTATE SMUGGLING
    // =========================================================

    const blackNet = await createInvestigation({
      title: "Operation Black Net — Interstate Smuggling Network",
      description:
        "Investigation into an interstate smuggling network operating across Lucknow, Kanpur and Noida.",
      priority: "high",

      documentTitle: "Intelligence Report — Operation Black Net",

      documentContent:
        "Synthetic intelligence report describing suspected coordination between multiple individuals, transport organizations, vehicles and locations.",

      entities: [
        // PERSONS
        {
          key: "vikram",
          entityType: "person",
          name: "Vikram Singh",
          alias: "Vicky",
          description: "Suspected network coordinator",
          phone: "+91-9000001001",
          city: "Lucknow",
          confidence: 0.91,
        },
        {
          key: "rajesh",
          entityType: "person",
          name: "Rajesh Kumar",
          alias: "Raju",
          description: "Logistics coordinator",
          phone: "+91-9000001002",
          city: "Kanpur",
          confidence: 0.87,
        },
        {
          key: "sanjay",
          entityType: "person",
          name: "Sanjay Mishra",
          alias: "Sanju",
          description: "Regional coordinator",
          phone: "+91-9000001003",
          city: "Noida",
          confidence: 0.84,
        },
        {
          key: "deepak",
          entityType: "person",
          name: "Deepak Yadav",
          alias: "DP",
          description: "Field associate",
          phone: "+91-9000001004",
          city: "Noida",
          confidence: 0.79,
        },
        {
          key: "ravi",
          entityType: "person",
          name: "Ravi Tiwari",
          description: "Financial intermediary",
          phone: "+91-9000001005",
          city: "Lucknow",
          confidence: 0.76,
        },

        // ORGANIZATIONS
        {
          key: "xyz",
          entityType: "organization",
          name: "XYZ Logistics",
          organizationType: "Transportation",
          confidence: 0.88,
        },
        {
          key: "sharma",
          entityType: "organization",
          name: "Sharma Trading Co.",
          organizationType: "Trading Front",
          confidence: 0.82,
        },
        {
          key: "transport",
          entityType: "organization",
          name: "Delhi Transport Union",
          organizationType: "Transport Network",
          confidence: 0.74,
        },

        // LOCATIONS
        {
          key: "lucknow",
          entityType: "location",
          name: "Lucknow",
          city: "Lucknow",
          district: "Lucknow",
          state: "Uttar Pradesh",
          confidence: 0.96,
        },
        {
          key: "kanpur",
          entityType: "location",
          name: "Kanpur",
          city: "Kanpur",
          district: "Kanpur Nagar",
          state: "Uttar Pradesh",
          confidence: 0.95,
        },
        {
          key: "noida",
          entityType: "location",
          name: "Noida",
          city: "Noida",
          district: "Gautam Buddh Nagar",
          state: "Uttar Pradesh",
          confidence: 0.95,
        },
        {
          key: "agra",
          entityType: "location",
          name: "Agra",
          city: "Agra",
          district: "Agra",
          state: "Uttar Pradesh",
          confidence: 0.91,
        },

        // VEHICLES
        {
          key: "vehicle1",
          entityType: "vehicle",
          name: "UP32AB1234",
          registrationNumber: "UP32AB1234",
          vehicleType: "SUV",
          vehicleMake: "Toyota Innova",
          confidence: 0.86,
        },
        {
          key: "vehicle2",
          entityType: "vehicle",
          name: "UP65CD5678",
          registrationNumber: "UP65CD5678",
          vehicleType: "SUV",
          vehicleMake: "Mahindra Scorpio",
          confidence: 0.83,
        },

        // PHONES
        {
          key: "phone1",
          entityType: "phone",
          name: "+91-9000001001",
          phone: "+91-9000001001",
          confidence: 0.94,
        },
        {
          key: "phone2",
          entityType: "phone",
          name: "+91-9000001002",
          phone: "+91-9000001002",
          confidence: 0.90,
        },

        // CASES
        {
          key: "case1",
          entityType: "case",
          name: "FIR/2026/00124",
          firNumber: "FIR/2026/00124",
          policeStation: "Hazratganj PS, Lucknow",
          sections: "NDPS Act 20, 120B",
          description: "Suspected interstate smuggling activity",
          caseDate: now - 55 * 24 * 60 * 60 * 1000,
          confidence: 0.95,
        },
        {
          key: "case2",
          entityType: "case",
          name: "FIR/2026/00318",
          firNumber: "FIR/2026/00318",
          policeStation: "Kotwali PS, Kanpur",
          sections: "IPC 420, 120B",
          description: "Suspected logistics and financial coordination",
          caseDate: now - 35 * 24 * 60 * 60 * 1000,
          confidence: 0.92,
        },

        // EVENTS
        {
          key: "event1",
          entityType: "event",
          name: "Planning Meeting — Lucknow",
          eventDate: now - 45 * 24 * 60 * 60 * 1000,
          eventLocation: "Lucknow",
          description: "Suspected coordination meeting",
          confidence: 0.84,
        },
        {
          key: "event2",
          entityType: "event",
          name: "Shipment Transfer — Kanpur",
          eventDate: now - 28 * 24 * 60 * 60 * 1000,
          eventLocation: "Kanpur",
          description: "Suspected shipment transfer",
          confidence: 0.88,
        },
      ],

      relationships: [
        { source: "vikram", target: "rajesh", type: "communicates_with", confidence: 0.91 },
        { source: "rajesh", target: "xyz", type: "associated_with", confidence: 0.86 },
        { source: "sanjay", target: "deepak", type: "directs", confidence: 0.89 },
        { source: "vikram", target: "sharma", type: "associated_with", confidence: 0.78 },

        { source: "vikram", target: "phone1", type: "uses", confidence: 0.94 },
        { source: "rajesh", target: "phone2", type: "uses", confidence: 0.90 },

        { source: "rajesh", target: "vehicle1", type: "uses", confidence: 0.83 },
        { source: "sanjay", target: "vehicle2", type: "uses", confidence: 0.81 },

        { source: "vikram", target: "lucknow", type: "located_in", confidence: 0.88 },
        { source: "rajesh", target: "kanpur", type: "located_in", confidence: 0.87 },
        { source: "sanjay", target: "noida", type: "located_in", confidence: 0.90 },

        { source: "xyz", target: "kanpur", type: "operates_in", confidence: 0.85 },
        { source: "sharma", target: "lucknow", type: "operates_in", confidence: 0.80 },

        { source: "vikram", target: "case1", type: "involved_in", confidence: 0.82 },
        { source: "rajesh", target: "case2", type: "involved_in", confidence: 0.79 },

        { source: "vikram", target: "event1", type: "participated_in", confidence: 0.87 },
        { source: "rajesh", target: "event2", type: "participated_in", confidence: 0.88 },

        { source: "case1", target: "lucknow", type: "occurred_at", confidence: 0.95 },
        { source: "case2", target: "kanpur", type: "occurred_at", confidence: 0.94 },
      ],
    });

    // =========================================================
    // INVESTIGATION 2
    // OPERATION SILENT LEDGER — FINANCIAL FRAUD
    // =========================================================

    const silentLedger = await createInvestigation({
      title: "Operation Silent Ledger — Financial Fraud",
      description:
        "Investigation into a suspected financial fraud network involving shell businesses and coordinated transactions.",
      priority: "high",

      documentTitle: "Financial Intelligence Report — Silent Ledger",

      documentContent:
        "Synthetic financial intelligence report describing relationships between individuals, businesses, accounts and transaction locations.",

      entities: [
        {
          key: "anil",
          entityType: "person",
          name: "Anil Mehta",
          alias: "AM",
          description: "Suspected financial coordinator",
          phone: "+91-9000002001",
          city: "Noida",
          confidence: 0.90,
        },
        {
          key: "neha",
          entityType: "person",
          name: "Neha Kapoor",
          description: "Accounts intermediary",
          phone: "+91-9000002002",
          city: "Delhi",
          confidence: 0.83,
        },
        {
          key: "rohit",
          entityType: "person",
          name: "Rohit Bansal",
          description: "Business intermediary",
          phone: "+91-9000002003",
          city: "Ghaziabad",
          confidence: 0.78,
        },
        {
          key: "fin1",
          entityType: "organization",
          name: "Meridian Exports",
          organizationType: "Import / Export",
          confidence: 0.86,
        },
        {
          key: "fin2",
          entityType: "organization",
          name: "North Star Consultancy",
          organizationType: "Consulting",
          confidence: 0.81,
        },
        {
          key: "loc1",
          entityType: "location",
          name: "Noida",
          city: "Noida",
          district: "Gautam Buddh Nagar",
          state: "Uttar Pradesh",
          confidence: 0.95,
        },
        {
          key: "loc2",
          entityType: "location",
          name: "Ghaziabad",
          city: "Ghaziabad",
          district: "Ghaziabad",
          state: "Uttar Pradesh",
          confidence: 0.94,
        },
        {
          key: "loc3",
          entityType: "location",
          name: "Delhi",
          city: "Delhi",
          district: "New Delhi",
          state: "Delhi",
          confidence: 0.95,
        },
        {
          key: "phone1",
          entityType: "phone",
          name: "+91-9000002001",
          phone: "+91-9000002001",
          confidence: 0.92,
        },
        {
          key: "phone2",
          entityType: "phone",
          name: "+91-9000002002",
          phone: "+91-9000002002",
          confidence: 0.89,
        },
        {
          key: "case1",
          entityType: "case",
          name: "FIR/2026/00451",
          firNumber: "FIR/2026/00451",
          policeStation: "Sector 20 PS, Noida",
          sections: "IPC 420, 467, 468",
          description: "Suspected financial fraud",
          caseDate: now - 50 * 24 * 60 * 60 * 1000,
          confidence: 0.94,
        },
        {
          key: "case2",
          entityType: "case",
          name: "FIR/2026/00503",
          firNumber: "FIR/2026/00503",
          policeStation: "Indirapuram PS, Ghaziabad",
          sections: "IPC 420, 120B",
          description: "Suspected coordinated financial transactions",
          caseDate: now - 22 * 24 * 60 * 60 * 1000,
          confidence: 0.91,
        },
        {
          key: "event1",
          entityType: "event",
          name: "Account Meeting — Noida",
          eventDate: now - 31 * 24 * 60 * 60 * 1000,
          eventLocation: "Noida",
          description: "Meeting involving suspected financial intermediaries",
          confidence: 0.82,
        },
      ],

      relationships: [
        { source: "anil", target: "neha", type: "communicates_with", confidence: 0.88 },
        { source: "anil", target: "rohit", type: "associated_with", confidence: 0.81 },

        { source: "anil", target: "fin1", type: "associated_with", confidence: 0.87 },
        { source: "rohit", target: "fin2", type: "associated_with", confidence: 0.80 },

        { source: "anil", target: "phone1", type: "uses", confidence: 0.92 },
        { source: "neha", target: "phone2", type: "uses", confidence: 0.89 },

        { source: "anil", target: "loc1", type: "located_in", confidence: 0.90 },
        { source: "rohit", target: "loc2", type: "located_in", confidence: 0.84 },
        { source: "neha", target: "loc3", type: "located_in", confidence: 0.86 },

        { source: "fin1", target: "loc1", type: "operates_in", confidence: 0.88 },
        { source: "fin2", target: "loc3", type: "operates_in", confidence: 0.83 },

        { source: "anil", target: "case1", type: "involved_in", confidence: 0.85 },
        { source: "rohit", target: "case2", type: "involved_in", confidence: 0.77 },

        { source: "anil", target: "event1", type: "participated_in", confidence: 0.82 },

        { source: "case1", target: "loc1", type: "occurred_at", confidence: 0.95 },
        { source: "case2", target: "loc2", type: "occurred_at", confidence: 0.93 },
      ],
    });

    // =========================================================
    // INVESTIGATION 3
    // OPERATION RED ROUTE — VEHICLE THEFT
    // =========================================================

    const redRoute = await createInvestigation({
      title: "Operation Red Route — Vehicle Theft Network",
      description:
        "Investigation into a suspected vehicle theft and resale network operating between western Uttar Pradesh districts.",
      priority: "medium",

      documentTitle: "Vehicle Intelligence Report — Red Route",

      documentContent:
        "Synthetic report describing suspected vehicle theft, transport and resale connections.",

      entities: [
        {
          key: "manoj",
          entityType: "person",
          name: "Manoj Chauhan",
          alias: "MC",
          description: "Suspected vehicle coordinator",
          phone: "+91-9000003001",
          city: "Meerut",
          confidence: 0.88,
        },
        {
          key: "faiz",
          entityType: "person",
          name: "Faiz Khan",
          description: "Vehicle transporter",
          phone: "+91-9000003002",
          city: "Ghaziabad",
          confidence: 0.82,
        },
        {
          key: "suresh",
          entityType: "person",
          name: "Suresh Pal",
          description: "Local associate",
          phone: "+91-9000003003",
          city: "Bulandshahr",
          confidence: 0.76,
        },

        {
          key: "org1",
          entityType: "organization",
          name: "Metro Auto Traders",
          organizationType: "Used Vehicle Dealer",
          confidence: 0.84,
        },
        {
          key: "org2",
          entityType: "organization",
          name: "Western Transport Services",
          organizationType: "Transport",
          confidence: 0.79,
        },

        {
          key: "meerut",
          entityType: "location",
          name: "Meerut",
          city: "Meerut",
          district: "Meerut",
          state: "Uttar Pradesh",
          confidence: 0.95,
        },
        {
          key: "ghaziabad",
          entityType: "location",
          name: "Ghaziabad",
          city: "Ghaziabad",
          district: "Ghaziabad",
          state: "Uttar Pradesh",
          confidence: 0.94,
        },
        {
          key: "buland",
          entityType: "location",
          name: "Bulandshahr",
          city: "Bulandshahr",
          district: "Bulandshahr",
          state: "Uttar Pradesh",
          confidence: 0.92,
        },

        {
          key: "car1",
          entityType: "vehicle",
          name: "UP15XY4821",
          registrationNumber: "UP15XY4821",
          vehicleType: "SUV",
          vehicleMake: "Hyundai Creta",
          confidence: 0.88,
        },
        {
          key: "car2",
          entityType: "vehicle",
          name: "UP14LM7312",
          registrationNumber: "UP14LM7312",
          vehicleType: "Sedan",
          vehicleMake: "Honda City",
          confidence: 0.84,
        },
        {
          key: "car3",
          entityType: "vehicle",
          name: "UP16QR9054",
          registrationNumber: "UP16QR9054",
          vehicleType: "SUV",
          vehicleMake: "Mahindra XUV",
          confidence: 0.81,
        },

        {
          key: "case1",
          entityType: "case",
          name: "FIR/2026/00671",
          firNumber: "FIR/2026/00671",
          policeStation: "Civil Lines PS, Meerut",
          sections: "IPC 379, 411",
          description: "Suspected vehicle theft",
          caseDate: now - 40 * 24 * 60 * 60 * 1000,
          confidence: 0.94,
        },
        {
          key: "case2",
          entityType: "case",
          name: "FIR/2026/00702",
          firNumber: "FIR/2026/00702",
          policeStation: "Sihani Gate PS, Ghaziabad",
          sections: "IPC 411, 414",
          description: "Suspected stolen vehicle resale",
          caseDate: now - 18 * 24 * 60 * 60 * 1000,
          confidence: 0.91,
        },

        {
          key: "event1",
          entityType: "event",
          name: "Vehicle Transfer — Ghaziabad",
          eventDate: now - 20 * 24 * 60 * 60 * 1000,
          eventLocation: "Ghaziabad",
          description: "Suspected vehicle handover",
          confidence: 0.86,
        },
      ],

      relationships: [
        { source: "manoj", target: "faiz", type: "communicates_with", confidence: 0.87 },
        { source: "faiz", target: "suresh", type: "associated_with", confidence: 0.79 },

        { source: "manoj", target: "org1", type: "associated_with", confidence: 0.82 },
        { source: "faiz", target: "org2", type: "associated_with", confidence: 0.80 },

        { source: "manoj", target: "car1", type: "linked_to", confidence: 0.89 },
        { source: "faiz", target: "car2", type: "linked_to", confidence: 0.85 },
        { source: "suresh", target: "car3", type: "linked_to", confidence: 0.78 },

        { source: "manoj", target: "meerut", type: "located_in", confidence: 0.90 },
        { source: "faiz", target: "ghaziabad", type: "located_in", confidence: 0.86 },
        { source: "suresh", target: "buland", type: "located_in", confidence: 0.82 },

        { source: "org1", target: "ghaziabad", type: "operates_in", confidence: 0.83 },
        { source: "org2", target: "meerut", type: "operates_in", confidence: 0.81 },

        { source: "manoj", target: "case1", type: "involved_in", confidence: 0.84 },
        { source: "faiz", target: "case2", type: "involved_in", confidence: 0.80 },

        { source: "faiz", target: "event1", type: "participated_in", confidence: 0.86 },

        { source: "case1", target: "meerut", type: "occurred_at", confidence: 0.95 },
        { source: "case2", target: "ghaziabad", type: "occurred_at", confidence: 0.94 },
      ],
    });

    // =========================================================
    // INVESTIGATION 4
    // OPERATION SHADOW CALL — ORGANIZED EXTORTION
    // =========================================================

    const shadowCall = await createInvestigation({
      title: "Operation Shadow Call — Organized Extortion",
      description:
        "Investigation into a suspected coordinated extortion network using multiple communication channels.",
      priority: "critical",

      documentTitle: "Communications Intelligence — Shadow Call",

      documentContent:
        "Synthetic communications intelligence report describing suspected extortion coordination.",

      entities: [
        {
          key: "karan",
          entityType: "person",
          name: "Karan Malhotra",
          alias: "KM",
          description: "Suspected coordinator",
          phone: "+91-9000004001",
          city: "Varanasi",
          confidence: 0.89,
        },
        {
          key: "pooja",
          entityType: "person",
          name: "Pooja Arora",
          description: "Communications intermediary",
          phone: "+91-9000004002",
          city: "Prayagraj",
          confidence: 0.81,
        },
        {
          key: "imran",
          entityType: "person",
          name: "Imran Sheikh",
          description: "Local associate",
          phone: "+91-9000004003",
          city: "Varanasi",
          confidence: 0.77,
        },
        {
          key: "naveen",
          entityType: "person",
          name: "Naveen Joshi",
          description: "Financial intermediary",
          phone: "+91-9000004004",
          city: "Prayagraj",
          confidence: 0.74,
        },

        {
          key: "org1",
          entityType: "organization",
          name: "Eastern Business Forum",
          organizationType: "Business Association",
          confidence: 0.72,
        },
        {
          key: "org2",
          entityType: "organization",
          name: "Ganga Event Services",
          organizationType: "Event Services",
          confidence: 0.76,
        },

        {
          key: "varanasi",
          entityType: "location",
          name: "Varanasi",
          city: "Varanasi",
          district: "Varanasi",
          state: "Uttar Pradesh",
          confidence: 0.96,
        },
        {
          key: "prayagraj",
          entityType: "location",
          name: "Prayagraj",
          city: "Prayagraj",
          district: "Prayagraj",
          state: "Uttar Pradesh",
          confidence: 0.95,
        },
        {
          key: "gorakhpur",
          entityType: "location",
          name: "Gorakhpur",
          city: "Gorakhpur",
          district: "Gorakhpur",
          state: "Uttar Pradesh",
          confidence: 0.92,
        },

        {
          key: "phone1",
          entityType: "phone",
          name: "+91-9000004001",
          phone: "+91-9000004001",
          confidence: 0.92,
        },
        {
          key: "phone2",
          entityType: "phone",
          name: "+91-9000004002",
          phone: "+91-9000004002",
          confidence: 0.87,
        },
        {
          key: "phone3",
          entityType: "phone",
          name: "+91-9000004003",
          phone: "+91-9000004003",
          confidence: 0.84,
        },

        {
          key: "case1",
          entityType: "case",
          name: "FIR/2026/00814",
          firNumber: "FIR/2026/00814",
          policeStation: "Lanka PS, Varanasi",
          sections: "IPC 384, 120B",
          description: "Suspected coordinated extortion",
          caseDate: now - 48 * 24 * 60 * 60 * 1000,
          confidence: 0.93,
        },
        {
          key: "case2",
          entityType: "case",
          name: "FIR/2026/00839",
          firNumber: "FIR/2026/00839",
          policeStation: "Civil Lines PS, Prayagraj",
          sections: "IPC 384, 506",
          description: "Suspected intimidation and extortion",
          caseDate: now - 16 * 24 * 60 * 60 * 1000,
          confidence: 0.90,
        },

        {
          key: "event1",
          entityType: "event",
          name: "Meeting — Varanasi",
          eventDate: now - 35 * 24 * 60 * 60 * 1000,
          eventLocation: "Varanasi",
          description: "Suspected network meeting",
          confidence: 0.83,
        },
        {
          key: "event2",
          entityType: "event",
          name: "Communication Session — Prayagraj",
          eventDate: now - 12 * 24 * 60 * 60 * 1000,
          eventLocation: "Prayagraj",
          description: "Suspected coordination session",
          confidence: 0.80,
        },
      ],

      relationships: [
        { source: "karan", target: "pooja", type: "communicates_with", confidence: 0.90 },
        { source: "karan", target: "imran", type: "directs", confidence: 0.86 },
        { source: "pooja", target: "naveen", type: "communicates_with", confidence: 0.82 },

        { source: "karan", target: "org1", type: "associated_with", confidence: 0.76 },
        { source: "naveen", target: "org2", type: "associated_with", confidence: 0.78 },

        { source: "karan", target: "phone1", type: "uses", confidence: 0.92 },
        { source: "pooja", target: "phone2", type: "uses", confidence: 0.87 },
        { source: "imran", target: "phone3", type: "uses", confidence: 0.84 },

        { source: "karan", target: "varanasi", type: "located_in", confidence: 0.91 },
        { source: "pooja", target: "prayagraj", type: "located_in", confidence: 0.86 },
        { source: "imran", target: "varanasi", type: "located_in", confidence: 0.84 },

        { source: "org1", target: "varanasi", type: "operates_in", confidence: 0.78 },
        { source: "org2", target: "prayagraj", type: "operates_in", confidence: 0.81 },

        { source: "karan", target: "case1", type: "involved_in", confidence: 0.83 },
        { source: "naveen", target: "case2", type: "involved_in", confidence: 0.76 },

        { source: "karan", target: "event1", type: "participated_in", confidence: 0.87 },
        { source: "pooja", target: "event2", type: "participated_in", confidence: 0.81 },

        { source: "case1", target: "varanasi", type: "occurred_at", confidence: 0.95 },
        { source: "case2", target: "prayagraj", type: "occurred_at", confidence: 0.94 },
      ],
    });

    // =========================================================
    // AUDIT LOG
    // =========================================================

    await ctx.db.insert("auditLogs", {
      action: "demo_data_loaded",
      entityType: "system",
      details:
        "SYNTHETIC DEMO DATA loaded: 4 investigations with separate investigation networks.",
      userId,
      createdAt: now,
    });

    return {
      investigations: 4,
      totalEntities:
        blackNet.entityCount +
        silentLedger.entityCount +
        redRoute.entityCount +
        shadowCall.entityCount,
      totalRelationships:
        blackNet.relationshipCount +
        silentLedger.relationshipCount +
        redRoute.relationshipCount +
        shadowCall.relationshipCount,
    };
  },
});

export const isLoaded = query({
  args: {},
  handler: async (ctx) => {
    const entities = await ctx.db.query("entities").first();
    return entities !== null;
  },
});
