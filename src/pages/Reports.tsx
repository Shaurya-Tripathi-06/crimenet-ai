import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import { FileText, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const [selectedInvestigation, setSelectedInvestigation] = useState("");
  const investigations = useQuery(api.investigations.list);
  const reportData = useQuery(
    api.reports.generate,
    selectedInvestigation
      ? { investigationId: selectedInvestigation as any }
      : "skip"
  );

  const handleExportJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${selectedInvestigation}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const rows = [
      ["Type", "Name", "Count/Value"],
      ...Object.entries(reportData.statistics.entityDistribution).map(
        ([k, v]) => ["Entity", k, String(v)]
      ),
      ...Object.entries(reportData.statistics.relationshipDistribution).map(
        ([k, v]) => ["Relationship", k, String(v)]
      ),
      ...reportData.topEntities.map((e) => [
        "KeyEntity",
        e.name,
        `Influence: ${(e.influenceScore * 100).toFixed(0)}%`,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${selectedInvestigation}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Reports</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Generate and export investigation reports
            </p>
          </div>
          {reportData && (
            <div className="flex gap-2">
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 hover:text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300 hover:text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          )}
        </div>

        <select
          value={selectedInvestigation}
          onChange={(e) => setSelectedInvestigation(e.target.value)}
          className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-cyan-500/40"
        >
          <option value="">Select Investigation...</option>
          {investigations?.map((inv) => (
            <option key={inv._id} value={inv._id}>
              {inv.title}
            </option>
          ))}
        </select>

        {reportData ? (
          <div className="space-y-4">
            {/* Investigation Info */}
            <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Investigation Details</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-gray-500">Title:</span> <span className="text-gray-200">{reportData.investigation.title}</span></div>
                <div><span className="text-gray-500">Status:</span> <span className="text-gray-200 capitalize">{reportData.investigation.status.replace(/_/g, " ")}</span></div>
                <div><span className="text-gray-500">Priority:</span> <span className="text-gray-200 uppercase">{reportData.investigation.priority}</span></div>
                <div><span className="text-gray-500">Created:</span> <span className="text-gray-200">{new Date(reportData.investigation.createdAt).toLocaleDateString("en-IN")}</span></div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Statistics</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-white/[0.02]">
                  <div className="text-xl font-bold text-white">{reportData.statistics.totalEntities}</div>
                  <div className="text-[11px] text-gray-500">Entities</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/[0.02]">
                  <div className="text-xl font-bold text-white">{reportData.statistics.totalRelationships}</div>
                  <div className="text-[11px] text-gray-500">Relationships</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/[0.02]">
                  <div className="text-xl font-bold text-white">{reportData.statistics.totalPatterns}</div>
                  <div className="text-[11px] text-gray-500">Patterns</div>
                </div>
              </div>
            </div>

            {/* Key Entities */}
            {reportData.topEntities.length > 0 && (
              <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Key Network Entities</h3>
                <div className="space-y-2">
                  {reportData.topEntities.map((e, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-cyan-400 w-5">#{i + 1}</span>
                        <div>
                          <span className="text-sm text-white">{e.name}</span>
                          <span className="text-xs text-gray-500 capitalize ml-2">{e.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Influence: {(e.influenceScore * 100).toFixed(0)}%</span>
                        <span>Degree: {(e.degreeCentrality * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patterns */}
            {reportData.patterns.length > 0 && (
              <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Detected Patterns</h3>
                <div className="space-y-2">
                  {reportData.patterns.map((p, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/[0.02]">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", p.severity === "critical" ? "text-red-400 bg-red-500/10" : p.severity === "high" ? "text-orange-400 bg-orange-500/10" : "text-yellow-400 bg-yellow-500/10")}>{p.severity.toUpperCase()}</span>
                        <span className="text-sm text-gray-200">{p.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center text-[11px] text-gray-600 py-4">
              Report generated on {new Date(reportData.generatedAt).toLocaleString("en-IN")}
            </div>
          </div>
        ) : selectedInvestigation ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400">Select an Investigation</h3>
            <p className="text-sm text-gray-600 mt-2">Choose an investigation to generate a report</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
