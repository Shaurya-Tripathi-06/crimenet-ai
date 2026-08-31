import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import { NetworkGraph } from "@/components/NetworkGraph";
import { Network, Loader2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CriminalNetworkPage() {
  const [selectedInvestigation, setSelectedInvestigation] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const investigations = useQuery(api.investigations.list);
  const graphData = useQuery(
    api.network.graphData,
    selectedInvestigation
      ? { investigationId: selectedInvestigation as any }
      : "skip"
  );
  const metrics = useQuery(
    api.network.getMetrics,
    selectedInvestigation
      ? { investigationId: selectedInvestigation as any }
      : "skip"
  );

  const typeFilters = [
    { key: "person", label: "Persons", color: "#22d3ee" },
    { key: "organization", label: "Orgs", color: "#a78bfa" },
    { key: "location", label: "Locations", color: "#34d399" },
    { key: "vehicle", label: "Vehicles", color: "#fb923c" },
    { key: "phone", label: "Phones", color: "#f472b6" },
    { key: "case", label: "Cases", color: "#ef4444" },
    { key: "event", label: "Events", color: "#facc15" },
  ];

  const filteredGraph = useMemo(() => {
  if (!graphData) return { nodes: [], edges: [] };

  const visibleNodeIds = new Set(
    typeFilter.length === 0
      ? graphData.nodes.map((n) => n.id)
      : graphData.nodes
          .filter((n) => typeFilter.includes(n.type))
          .map((n) => n.id)
  );

  const nodes =
    typeFilter.length === 0
      ? graphData.nodes
      : graphData.nodes.filter((n) => visibleNodeIds.has(n.id));

  const edges = graphData.edges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  return { nodes, edges };
}, [graphData, typeFilter]);

  const toggleFilter = (type: string) => {
    setTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Key individuals from metrics
  const keyIndividuals = useMemo(() => {
    if (!metrics || !graphData) return [];
    return metrics
      .sort((a, b) => b.influenceScore - a.influenceScore)
      .slice(0, 5)
      .map((m) => {
        const node = graphData.nodes.find((n) => n.id === m.entityId);
        return { ...m, name: node?.label || "Unknown", type: node?.type || "unknown" };
      });
  }, [metrics, graphData]);

  return (
    <AppLayout>
      <div className="space-y-4 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Network</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Interactive visualization of criminal relationships
            </p>
          </div>
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
        </div>

        {/* Type filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          {typeFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border",
                typeFilter.includes(f.key)
                  ? "border-white/[0.15] bg-white/[0.06] text-white"
                  : "border-white/[0.06] bg-transparent text-gray-500 hover:text-gray-300"
              )}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: f.color }}
              />
              {f.label}
            </button>
          ))}
        </div>

        {selectedInvestigation ? (
          <div className="flex gap-4">
            {/* Graph */}
            <div className="flex-1 bg-[#0a0e14] border border-white/[0.06] rounded-xl overflow-hidden" style={{ height: "600px" }}>
              {graphData ? (
                filteredGraph.nodes.length > 0 ? (
                  <NetworkGraph
                    nodes={filteredGraph.nodes}
                    edges={filteredGraph.edges}
                    height="600px"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Network className="w-10 h-10 mb-3 text-gray-600" />
                    <p className="text-sm">No matching entities</p>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                </div>
              )}
            </div>

            {/* Key individuals sidebar */}
            {keyIndividuals.length > 0 && (
              <div className="w-72 shrink-0 hidden xl:block">
                <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Key Network Individuals
                  </h3>
                  <div className="space-y-3">
                    {keyIndividuals.map((ind, i) => (
                      <div key={ind.entityId} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-cyan-400 w-5">
                          #{i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {ind.name}
                          </div>
                          <div className="text-[10px] text-gray-500 capitalize">
                            Influence: {(ind.influenceScore * 100).toFixed(0)}% •{" "}
                            {ind.type}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Network className="w-16 h-16 text-gray-700 mb-4" />                <h3 className="text-sm font-semibold text-gray-400">
              Select an Investigation
            </h3>
            <p className="text-xs text-gray-600 mt-1 max-w-xs">
              Choose an investigation to view its network
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
