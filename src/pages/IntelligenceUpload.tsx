import { useRef, useState } from "react";
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

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function IntelligenceUploadPage() {
  const investigations = useQuery(api.investigations.list);

  const createDocument = useMutation(api.documents.create);
  const markProcessed = useMutation(api.documents.markProcessed);
  const createEntities = useMutation(api.entities.createMany);
  const createRelationships = useMutation(api.relationships.createMany);

  const extractEntities = useAction(api.ai.extractEntities);
  const extractRelationships = useAction(api.ai.extractRelationships);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedInvestigation, setSelectedInvestigation] = useState("");
  const [textInput, setTextInput] = useState("");

  const [status, setStatus] = useState<
    "idle" | "processing" | "done" | "error"
  >("idle");

  const [result, setResult] = useState("");
  const [entityCount, setEntityCount] = useState(0);
  const [relCount, setRelCount] = useState(0);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileError, setFileError] = useState("");

  const EXAMPLE_TEXT = `Amit Verma was observed communicating with Raj Malhotra using phone number +91-9876543210. Raj Malhotra has connections with XYZ Logistics and was repeatedly seen in Lucknow and Kanpur.

Sanjay Mishra controls the Noida cell with help from Deepak Yadav. Sanjay Mishra used vehicle UP32AB1234 to transport materials between Noida and Lucknow. Deepak Yadav used vehicle UP65CD5678 to assist the transport operation.

A meeting was held at Sector 62, Noida on February 20, 2024 between Ravi Tiwari and Priya Verma at the Lucknow Real Estate Group office.

FIR/2024/001234 was registered at Hazratganj Police Station, Lucknow under IPC 302, 307, 120B and NDPS Act 20.

Ravi Tiwari is associated with Lucknow Real Estate Group and communicated with Priya Verma regarding the meeting. Priya Verma was seen traveling between Lucknow and Noida using vehicle UP32AB1234.

The investigation indicates that XYZ Logistics provided transportation support to Sanjay Mishra and Deepak Yadav. Vehicle UP65CD5678 was observed near Sector 62, Noida during a suspected transfer operation.`;

  // ------------------------------------------------------------
  // File extraction
  // ------------------------------------------------------------

  const extractPdfText = async (file: File) => {
    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
    }).promise;

    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");

      pages.push(pageText);
    }

    return pages.join("\n\n");
  };

  const extractDocxText = async (file: File) => {
    const buffer = await file.arrayBuffer();

    const extracted = await mammoth.extractRawText({
      arrayBuffer: buffer,
    });

    return extracted.value;
  };

  const extractFileText = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "txt":
      case "csv":
        return await file.text();

      case "json": {
        const raw = await file.text();

        try {
          const parsed = JSON.parse(raw);
          return JSON.stringify(parsed, null, 2);
        } catch {
          throw new Error(
            "The selected JSON file is not valid JSON.",
          );
        }
      }

      case "pdf":
        return await extractPdfText(file);

      case "docx":
        return await extractDocxText(file);

      default:
        throw new Error(
          "Unsupported file type. Please select a PDF, TXT, CSV, JSON, or DOCX file.",
        );
    }
  };

  const handleFile = async (file: File) => {
    setFileError("");
    setResult("");
    setStatus("idle");

    const extension = file.name.split(".").pop()?.toLowerCase();

    const supportedExtensions = [
      "pdf",
      "txt",
      "csv",
      "json",
      "docx",
    ];

    if (
      !extension ||
      !supportedExtensions.includes(extension)
    ) {
      setFileError(
        "Unsupported file type. Please use PDF, TXT, CSV, JSON, or DOCX.",
      );
      return;
    }

    try {
      setIsExtracting(true);

      const extractedText = await extractFileText(file);

      if (!extractedText.trim()) {
        throw new Error(
          "No readable text could be extracted from this file.",
        );
      }

      setSelectedFile(file);
      setTextInput(extractedText.trim());
    } catch (error) {
      console.error("File extraction error:", error);

      setFileError(
        error instanceof Error
          ? error.message
          : "Failed to extract text from the file.",
      );

      setSelectedFile(null);
    } finally {
      setIsExtracting(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      void handleFile(file);
    }
  };

  // ------------------------------------------------------------
  // Submit / AI analysis
  // ------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInvestigation || !textInput.trim()) {
      return;
    }

    setStatus("processing");
    setResult("");
    setEntityCount(0);
    setRelCount(0);
    setFileError("");

    try {
      // 1. Save document
      const docId = await createDocument({
        title: selectedFile
          ? selectedFile.name
          : `Report — ${new Date().toLocaleDateString("en-IN")}`,
        content: textInput,
        fileType: selectedFile
          ? selectedFile.name.split(".").pop()?.toLowerCase() || "text"
          : "text",
        investigationId:
          selectedInvestigation as any,
      });

      // 2. Extract entities using Gemini
      const entityResult = await extractEntities({
        text: textInput,
        investigationId:
          selectedInvestigation as any,
        documentId: docId,
      });

      if (!entityResult.success) {
        setStatus("error");
        setResult(
          entityResult.error || "Extraction failed",
        );
        return;
      }

      // 3. Save extracted entities
      const entityIds = await createEntities({
        entities: entityResult.entities.map((e) => ({
          ...e,
          investigationId:
            selectedInvestigation as any,
          documentId: docId,
        })),
      });

      setEntityCount(entityIds.length);

      // 4. Extract relationships using the newly-created entity IDs
      const relResult = await extractRelationships({
        text: textInput,
        entityIds: entityIds as any,
        investigationId:
          selectedInvestigation as any,
        documentId: docId,
      });

      console.log(
        "Relationship extraction result:",
        relResult,
      );

      if (!relResult.success) {
        console.error(
          "Relationship extraction failed:",
          relResult.error,
        );

        setStatus("error");
        setResult(
          relResult.error ||
            "Relationship extraction failed",
        );
        return;
      }

      console.log(
        "Relationships returned by AI:",
        relResult.relationships,
      );

      // 5. Save relationships to Convex
      if (relResult.relationships.length > 0) {
        await createRelationships({
          relationships: relResult.relationships.map(
            (r) => ({
              sourceId: r.sourceId,
              targetId: r.targetId,
              relationshipType:
                r.relationshipType,
              confidence: r.confidence,
              investigationId:
                r.investigationId,
              documentId: r.documentId,
            }),
          ),
        });
      }

      setRelCount(relResult.relationships.length);

      // 6. Mark document as processed
      await markProcessed({
        id: docId,
      });

      // 7. Success
      setStatus("done");

      setResult(
        `Extracted ${entityIds.length} entities and ${relResult.relationships.length} relationships.`,
      );
    } catch (err) {
      console.error(
        "Intelligence processing error:",
        err,
      );

      setStatus("error");

      setResult(
        err instanceof Error
          ? err.message
          : "An error occurred",
      );
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-white">
            Upload Intelligence
          </h1>

          <p className="text-xs text-gray-600 mt-0.5">
            Submit text for AI-powered entity and relationship extraction
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Investigation */}
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block">
              Investigation
            </label>

            <select
              value={selectedInvestigation}
              onChange={(e) =>
                setSelectedInvestigation(e.target.value)
              }
              className="w-full h-9 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white focus:outline-none focus:border-cyan-500/30"
              required
            >
              <option value="">
                Select investigation...
              </option>

              {investigations?.map((inv) => (
                <option
                  key={inv._id}
                  value={inv._id}
                >
                  {inv.title}
                </option>
              ))}
            </select>
          </div>

          {/* Intelligence text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-gray-500">
                Intelligence Text
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTextInput(EXAMPLE_TEXT)}
                  className="text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
                >
                  Load example
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTextInput("");
                    setSelectedFile(null);
                    setFileError("");
                    setResult("");
                    setStatus("idle");
                    setEntityCount(0);
                    setRelCount(0);
                  }}
                  className="text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <textarea
              value={textInput}
              onChange={(e) =>
                setTextInput(e.target.value)
              }
              className="w-full h-40 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/30 resize-none font-mono text-xs leading-relaxed"
              placeholder="Paste FIR text, police report, surveillance notes, or any intelligence document..."
              required
            />
          </div>

          {/* Existing upload UI — functionality added without redesigning it */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-white/[0.06] rounded-xl p-6 text-center cursor-pointer hover:border-cyan-500/20 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.csv,.json,.docx"
              onChange={handleFileChange}
              className="hidden"
            />

            {isExtracting ? (
              <>
                <Loader2 className="w-6 h-6 text-gray-700 mx-auto mb-2 animate-spin" />

                <p className="text-[11px] text-gray-600">
                  Extracting text from file...
                </p>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-700 mx-auto mb-2" />

                <p className="text-[11px] text-gray-600">
                  PDF, TXT, CSV, JSON, and DOCX files are supported for text extraction
                </p>
              </>
            )}
          </div>

          {/* File extraction error */}
          {fileError && (
            <p className="text-[10px] text-red-400">
              {fileError}
            </p>
          )}

          {/* Analyze */}
          <button
            type="submit"
            disabled={
              !selectedInvestigation ||
              !textInput.trim() ||
              status === "processing" ||
              isExtracting
            }
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-cyan-500 text-white text-xs font-medium hover:bg-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === "processing" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Brain className="w-3.5 h-3.5" />
                Analyze
              </>
            )}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div
            className={cn(
              "rounded-xl p-4 border text-sm",
              status === "done"
                ? "bg-green-500/5 border-green-500/10"
                : "bg-red-500/5 border-red-500/10",
            )}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {status === "done" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              )}

              <span
                className={cn(
                  "text-xs font-medium",
                  status === "done"
                    ? "text-green-400"
                    : "text-red-400",
                )}
              >
                {status === "done"
                  ? "Complete"
                  : "Error"}
              </span>
            </div>

            <p className="text-xs text-gray-400">
              {result}
            </p>

            {status === "done" && (
              <div className="flex gap-3 mt-2 text-[10px] text-gray-600">
                <span>
                  Entities: {entityCount}
                </span>

                <span>
                  Relationships: {relCount}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}