import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import { GitBranch, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RelationshipExplorerPage() {
  const [selectedInvestigation, setSelectedInvestigation] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const investigations = useQuery(api.investigations.list);
  const relationships = useQuery(
    api.relationships.list,
    selectedInvestigation
      ? { investigationId: selectedInvestigation as any }
      : "skip"
  );

  const filtered = relationships?.filter(
    (r) => !typeFilter || r.relationshipType === typeFilter
  );

  const relTypes = [
    ...new Set(relationships?.map((r) => r.relationshipType) || []),
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Relationships</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Browse and filter entity relationships
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedInvestigation}
            onChange={(e) => setSelectedInvestigation(e.target.value)}
            className="h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-cyan-500/40"
          >
            <option value="">Select Investigation...</option>
            {investigations?.map((inv) => (
              <option key={inv._id} value={inv._id}>
                {inv.title}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-cyan-500/40"
          >
            <option value="">All Types</option>
            {relTypes.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                  <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Target</th>
                  <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                  <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered?.map((r) => (
                  <tr key={r._id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="text-gray-200">{r.source?.name || "Unknown"}</div>
                      <div className="text-[10px] text-gray-500 capitalize">{r.source?.entityType}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                        {r.relationshipType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-200">{r.target?.name || "Unknown"}</div>
                      <div className="text-[10px] text-gray-500 capitalize">{r.target?.entityType}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-xs font-medium",
                        r.confidence >= 0.9 ? "text-green-400" : r.confidence >= 0.7 ? "text-cyan-400" : "text-yellow-400"
                      )}>
                        {(r.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.date ? new Date(r.date).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
                {(!filtered || filtered.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center text-gray-500 text-sm">
                      {selectedInvestigation ? "No relationships found" : "Select an investigation to view relationships"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
