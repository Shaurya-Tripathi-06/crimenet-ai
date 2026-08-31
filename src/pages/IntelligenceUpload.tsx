import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function IntelligenceUploadPage() {
  const investigations = useQuery(api.investigations.list);
  const createDocument = useMutation(api.documents.create);
  const markProcessed = useMutation(api.documents.markProcessed);
  const createEntities = useMutation(api.entities.createMany);
  const createRelationships = useMutation(api.relationships.createMany);
  const extractEntities = useAction(api.ai.extractEntities);
  const extractRelationships = useAction(api.ai.extractRelationships);

  const [selectedInvestigation, setSelectedInvestigation] = useState("");
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [result, setResult] = useState("");
  const [entityCount, setEntityCount] = useState(0);
  const [relCount, setRelCount] = useState(0);

  const EXAMPLE_TEXT = `Amit Verma was observed communicating with Raj Malhotra using phone number +91-9876543210. Raj Malhotra has connections with XYZ Logistics and was repeatedly seen in Lucknow and Kanpur.

Sanjay Mishra controls the Noida cell with help from Deepak Yadav. Sanjay Mishra used vehicle UP32AB1234 to transport materials between Noida and Lucknow. Deepak Yadav used vehicle UP65CD5678 to assist the transport operation.

A meeting was held at Sector 62, Noida on February 20, 2024 between Ravi Tiwari and Priya Verma at the Lucknow Real Estate Group office.

FIR/2024/001234 was registered at Hazratganj Police Station, Lucknow under IPC 302, 307, 120B and NDPS Act 20.

Ravi Tiwari is associated with Lucknow Real Estate Group and communicated with Priya Verma regarding the meeting. Priya Verma was seen traveling between Lucknow and Noida using vehicle UP32AB1234.

The investigation indicates that XYZ Logistics provided transportation support to Sanjay Mishra and Deepak Yadav. Vehicle UP65CD5678 was observed near Sector 62, Noida during a suspected transfer operation.`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestigation || !textInput.trim()) return;
    setStatus("processing");
    setResult("");
    setEntityCount(0);
    setRelCount(0);

    try {
      const docId = await createDocument({
        title: `Report — ${new Date().toLocaleDateString("en-IN")}`,
        content: textInput,
        fileType: "text",
        investigationId: selectedInvestigation as any,
      });

      const entityResult = await extractEntities({
        text: textInput,
        investigationId: selectedInvestigation as any,
        documentId: docId,
      });

      if (!entityResult.success) {
        setStatus("error");
        setResult(entityResult.error || "Extraction failed");
        return;
      }

      const entityIds = await createEntities({
        entities: entityResult.entities.map((e: any) => ({
          ...e,
          investigationId: selectedInvestigation as any,
          documentId: docId,
        })),
      });
      setEntityCount(entityIds.length);

      const relResult = await extractRelationships({
        text: textInput,
        entityIds: entityIds as any,
        investigationId: selectedInvestigation as any,
        documentId: docId,
      });

      console.log("Relationship extraction result:", relResult);

      if (!relResult.success) {
        console.error("Relationship extraction failed:", relResult.error);

        setStatus("error");
        setResult(
          relResult.error || "Relationship extraction failed"
        );
        return;
        }

      console.log(
        "Relationships returned by AI:",
        relResult.relationships
      );

      if (relResult.relationships.length > 0) {
        await createRelationships({
          relationships: relResult.relationships.map((r: any) => ({
            ...r,
            investigationId: selectedInvestigation as any,
            documentId: docId,
          })),
        });
      }

      setRelCount(relResult.relationships.length);

      await markProcessed({ id: docId });
      setStatus("done");
      setResult(`Extracted ${entityIds.length} entities and ${relResult.relationships.length} relationships.`);
    } catch (err) {
      setStatus("error");
      setResult(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Upload Intelligence</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Submit text for AI-powered entity and relationship extraction
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">Investigation</label>
            <select
              value={selectedInvestigation}
              onChange={(e) => setSelectedInvestigation(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white focus:outline-none focus:border-cyan-500/30"
              required
            >
              <option value="">Select investigation...</option>
              {investigations?.map((inv) => (
                <option key={inv._id} value={inv._id}>{inv.title}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-gray-500">Intelligence Text</label>
              <button
                type="button"
                onClick={() => setTextInput(EXAMPLE_TEXT)}
                className="text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
              >
                Load example
              </button>
            </div>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full h-40 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/30 resize-none font-mono text-xs leading-relaxed"
              placeholder="Paste FIR text, police report, surveillance notes, or any intelligence document..."
              required
            />
          </div>

          <div className="border border-dashed border-white/[0.06] rounded-xl p-6 text-center">
            <Upload className="w-6 h-6 text-gray-700 mx-auto mb-2" />
            <p className="text-[11px] text-gray-600">
              PDF, TXT, CSV, JSON, and DOCX files are supported for text extraction
            </p>
          </div>

          <button
            type="submit"
            disabled={!selectedInvestigation || !textInput.trim() || status === "processing"}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-cyan-500 text-white text-xs font-medium hover:bg-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === "processing" ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
            ) : (
              <><Brain className="w-3.5 h-3.5" /> Analyze</>
            )}
          </button>
        </form>

        {result && (
          <div className={cn("rounded-xl p-4 border text-sm", status === "done" ? "bg-green-500/5 border-green-500/10" : "bg-red-500/5 border-red-500/10")}>
            <div className="flex items-center gap-1.5 mb-1">
              {status === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
              <span className={cn("text-xs font-medium", status === "done" ? "text-green-400" : "text-red-400")}>
                {status === "done" ? "Complete" : "Error"}
              </span>
            </div>
            <p className="text-xs text-gray-400">{result}</p>
            {status === "done" && (
              <div className="flex gap-3 mt-2 text-[10px] text-gray-600">
                <span>Entities: {entityCount}</span>
                <span>Relationships: {relCount}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
