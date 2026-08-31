import { useState } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import { NetworkGraph } from "@/components/NetworkGraph";
import {
  DistributionChart,
  RelationshipChart,
} from "@/components/DashboardCharts";
import {
  Loader2,
  Clock,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  FileText,
  Upload,
  Brain,
  Calendar,
  Network,
  Users,
  GitBranch,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "statistics", label: "Statistics", icon: Users },
  { id: "network", label: "Network", icon: Network },
  { id: "entities", label: "Entities", icon: Users },
  { id: "relationships", label: "Relationships", icon: GitBranch },
  { id: "timeline", label: "Timeline", icon: Calendar },
  { id: "patterns", label: "Patterns", icon: AlertTriangle },
  { id: "ai", label: "AI Insights", icon: Brain },
  { id: "documents", label: "Documents", icon: FileText },
];

const STATUS_CONFIG: Record<string, any> = {
  open: { label: "Open", color: "text-cyan-400", bg: "bg-cyan-500/10", icon: Clock },
  under_investigation: { label: "Under Investigation", color: "text-yellow-400", bg: "bg-yellow-500/10", icon: AlertCircle },
  closed: { label: "Closed", color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle2 },
  suspended: { label: "Suspended", color: "text-red-400", bg: "bg-red-500/10", icon: PauseCircle },
};

export default function InvestigationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const invId = id as any;
  const [activeTab, setActiveTab] = useState("overview");

  const investigation = useQuery(
    api.investigations.get,
    invId ? { id: invId } : "skip"
  );
  const entities = useQuery(
    api.entities.list,
    invId ? { investigationId: invId } : "skip"
  );
  const relationships = useQuery(
    api.relationships.list,
    invId ? { investigationId: invId } : "skip"
  );
  const graphData = useQuery(
    api.network.graphData,
    invId ? { investigationId: invId } : "skip"
  );
  const entityStats = useQuery(
    api.dashboard.investigationStats,
    invId ? { investigationId: invId } : "skip"
  );
  const patterns = useQuery(
    api.patterns.list,
    invId ? { investigationId: invId } : "skip"
  );
  const insights = useQuery(
    api.insights.list,
    invId ? { investigationId: invId } : "skip"
  );
  const documents = useQuery(
    api.documents.list,
    invId ? { investigationId: invId } : "skip"
  );
  const timeline = useQuery(
    api.dashboard.timelineData,
    invId ? { investigationId: invId } : "skip"
  );
  const detectPatterns = useMutation(api.patterns.detectPatterns);
  const generateInsight = useAction(api.ai.generateInsight);
  const generateSummary = useAction(api.ai.generateSummary);

  if (!investigation) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      </AppLayout>
    );
  }

  const statusCfg = STATUS_CONFIG[investigation.status];
  const StatusIcon = statusCfg?.icon || Clock;

  const buildContext = () => {
    if (!entities || !relationships) return "";
    const entityList = entities
      .map(
        (e) =>
          `- ${e.name} (${e.entityType}${e.alias ? `, alias: ${e.alias}` : ""}${e.city ? `, city: ${e.city}` : ""})`
      )
      .join("\n");
    const relList = relationships
      .map(
        (r) =>
          `- ${r.source?.name || "?"} → ${r.relationshipType} → ${r.target?.name || "?"} (confidence: ${(r.confidence * 100).toFixed(0)}%)`
      )
      .join("\n");
    const patternList = patterns
      ?.map((p) => `- [${p.severity.toUpperCase()}] ${p.description}`)
      .join("\n");
    return `Investigation: ${investigation.title}\n${investigation.description}\n\nEntities:\n${entityList}\n\nRelationships:\n${relList}\n\nPatterns:\n${patternList || "None detected"}`;
  };

  const handleDetectPatterns = async () => {
    if (!invId) return;
    await detectPatterns({ investigationId: invId });
  };

  const handleGenerateInsight = async () => {
    if (!invId) return;
    await generateInsight({
      investigationId: invId,
      context: buildContext(),
    });
  };

  const handleGenerateSummary = async () => {
    if (!invId) return;
    await generateSummary({
      investigationId: invId,
      context: buildContext(),
    });
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-bold text-white">{investigation.title}</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                statusCfg?.bg,
                statusCfg?.color
              )}
            >
              <StatusIcon className="w-3 h-3" />
              {statusCfg?.label}
            </span>
            <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", investigation.priority === "critical" ? "text-red-400 bg-red-500/10" : investigation.priority === "high" ? "text-orange-400 bg-orange-500/10" : "text-gray-400 bg-white/5")}>
              {investigation.priority.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-gray-500">{investigation.description}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-white/[0.06]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  activeTab === tab.id
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="min-h-[400px]">
          {activeTab === "overview" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBox label="Entities" value={entities?.length || 0} />
              <StatBox label="Relationships" value={relationships?.length || 0} />
              <StatBox label="Patterns" value={patterns?.length || 0} />
              <StatBox label="Documents" value={documents?.length || 0} />
            </div>
          )}

          {activeTab === "statistics" && entityStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-5">
                <DistributionChart data={entityStats.entityDistribution} title="Entity Distribution" />
              </div>
              <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-5">
                <RelationshipChart data={entityStats.relationshipDistribution} />
              </div>
            </div>
          )}

          {activeTab === "network" && graphData && (
            <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl overflow-hidden" style={{ height: "500px" }}>
              {graphData.nodes.length > 0 ? (
                <NetworkGraph nodes={graphData.nodes} edges={graphData.edges} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Network className="w-10 h-10 mb-3 text-gray-600" />
                  <p className="text-sm">No network data available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "entities" && (
            <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {entities?.map((e) => (
                      <tr key={e._id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-gray-200 font-medium">{e.name}</td>
                        <td className="px-4 py-3 text-gray-400 capitalize">{e.entityType}</td>
                        <td className="px-4 py-3">
                          <ConfidenceBadge value={e.confidence} />
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{e.city || e.registrationNumber || e.firNumber || e.phone || "—"}</td>
                      </tr>
                    ))}
                    {(!entities || entities.length === 0) && (
                      <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500 text-sm">No entities found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "relationships" && (
            <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Source</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Target</th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {relationships?.map((r) => (
                      <tr key={r._id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-gray-200">{r.source?.name || "Unknown"}</td>
                        <td className="px-4 py-3 text-cyan-400 text-xs font-medium">{r.relationshipType.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-gray-200">{r.target?.name || "Unknown"}</td>
                        <td className="px-4 py-3"><ConfidenceBadge value={r.confidence} /></td>
                      </tr>
                    ))}
                    {(!relationships || relationships.length === 0) && (
                      <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500 text-sm">No relationships found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="space-y-3">
              {timeline && timeline.length > 0 ? (
                timeline.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 bg-[#0f1520] border border-white/[0.06] rounded-xl p-4">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 shrink-0" />
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">{item.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 uppercase">{item.type}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.details}</p>
                      <p className="text-[11px] text-gray-600 mt-1">{new Date(item.date).toLocaleDateString("en-IN")}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 text-sm py-10">No timeline events</div>
              )}
            </div>
          )}

          {activeTab === "patterns" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={handleDetectPatterns} className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors border border-cyan-500/20">
                  Run Pattern Detection
                </button>
              </div>
              {patterns?.map((p) => (
                <div key={p._id} className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={cn("w-4 h-4", p.severity === "critical" ? "text-red-400" : p.severity === "high" ? "text-orange-400" : "text-yellow-400")} />
                        <span className="text-sm font-medium text-white">{p.patternType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", p.severity === "critical" ? "text-red-400 bg-red-500/10" : p.severity === "high" ? "text-orange-400 bg-orange-500/10" : "text-yellow-400 bg-yellow-500/10")}>{p.severity.toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{p.description}</p>
                      <p className="text-xs text-gray-600 mt-1">{p.evidence}</p>
                    </div>
                    <span className="text-[10px] text-gray-600 shrink-0">{new Date(p.detectedAt).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
              ))}
              {(!patterns || patterns.length === 0) && (
                <div className="text-center text-gray-500 text-sm py-10">No patterns detected yet</div>
              )}
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button onClick={handleGenerateInsight} className="px-4 py-2 rounded-lg bg-purple-500/10 text-purple-400 text-sm font-medium hover:bg-purple-500/20 transition-colors border border-purple-500/20">
                  <Brain className="w-4 h-4 inline mr-1.5" />
                  Generate AI Insight
                </button>
                <button onClick={handleGenerateSummary} className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                  Generate Summary Report
                </button>
              </div>
              {insights?.map((ins) => (
                <div key={ins._id} className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                      AI-GENERATED ANALYSIS
                    </span>
                    <span className="text-[10px] text-gray-600">{new Date(ins.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{ins.content}</div>
                </div>
              ))}
              {(!insights || insights.length === 0) && (
                <div className="text-center text-gray-500 text-sm py-10">No AI insights generated yet</div>
              )}
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-3">
              {documents?.map((doc) => (
                <div key={doc._id} className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <div>
                        <h4 className="text-sm font-medium text-white">{doc.title}</h4>
                        <p className="text-[11px] text-gray-500">{doc.fileType} • {new Date(doc.createdAt).toLocaleDateString("en-IN")}</p>
                      </div>
                    </div>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", doc.processed ? "text-green-400 bg-green-500/10" : "text-yellow-400 bg-yellow-500/10")}>
                      {doc.processed ? "Processed" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
              {(!documents || documents.length === 0) && (
                <div className="text-center text-gray-500 text-sm py-10">No documents uploaded</div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-4">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = (value * 100).toFixed(0);
  const color =
    value >= 0.9
      ? "text-green-400"
      : value >= 0.7
        ? "text-cyan-400"
        : value >= 0.4
          ? "text-yellow-400"
          : "text-red-400";
  return (
    <span className={cn("text-xs font-medium", color)}>
      {pct}%
    </span>
  );
}
