import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import {
  AlertTriangle,
  Loader2,
  Shield,
  RefreshCw,
  Users,
  MapPin,
  Phone,
  Car,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: "text-red-400", bg: "bg-red-500/10" },
  high: { color: "text-orange-400", bg: "bg-orange-500/10" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-500/10" },
  low: { color: "text-blue-400", bg: "bg-blue-500/10" },
};

const PATTERN_ICONS: Record<string, any> = {
  shared_phone: Phone,
  shared_vehicle: Car,
  high_connectivity: Users,
  common_intermediary: Shield,
  geographic_clustering: MapPin,
  organization_clustering: Building2,
  repeated_interactions: RefreshCw,
};

export default function PatternDetectionPage() {
  const [selectedInvestigation, setSelectedInvestigation] = useState("");
  const investigations = useQuery(api.investigations.list);
  const patterns = useQuery(
    api.patterns.list,
    selectedInvestigation
      ? { investigationId: selectedInvestigation as any }
      : "skip"
  );
  const detectPatterns = useMutation(api.patterns.detectPatterns);
  const [detecting, setDetecting] = useState(false);
  
  useEffect(() => {
    if (!selectedInvestigation) return;

    const runDetection = async () => {
      setDetecting(true);
      try {
        await detectPatterns({
          investigationId: selectedInvestigation as any,
        });
      } finally {
        setDetecting(false);
      }
    };

    runDetection();
  }, [selectedInvestigation, detectPatterns]);

  

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Patterns</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Suspicious pattern detection across network data
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
            
          </div>
        </div>

        {!selectedInvestigation ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-700 mb-4" />
            <h3 className="text-lg font-semibold text-gray-400">Select an Investigation</h3>
            <p className="text-sm text-gray-600 mt-2">
              Choose an investigation to run pattern detection
            </p>
          </div>
        ) : patterns ? (
          patterns.length === 0 ? (
            <div className="text-center py-20">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-300">No patterns detected</h3>
              <p className="text-sm text-gray-500 mt-2">
                Run pattern detection to identify suspicious patterns
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {patterns.map((p) => {
                const sevCfg = SEVERITY_CONFIG[p.severity] || SEVERITY_CONFIG.medium;
                const PatternIcon = PATTERN_ICONS[p.patternType] || AlertTriangle;
                return (
                  <div key={p._id} className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition-colors">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          sevCfg.bg
                        )}
                      >
                        <PatternIcon className={cn("w-5 h-5", sevCfg.color)} />
                      </div>

                      <div className="flex-1 min-w-0">

                        {/* Entity names — TOPMOST */}
                        {p.entities && p.entities.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {p.entities.map((e: any) => (
                              <span
                                key={e?._id || e}
                                className="text-xs font-medium px-2.5 py-1 rounded-md bg-white/5 text-gray-300"
                              >
                                {e?.name || "Entity"}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Pattern title */}
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-white">
                            {p.patternType
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </h3>

                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-medium",
                              sevCfg.bg,
                              sevCfg.color
                            )}
                          >
                            {p.severity.toUpperCase()}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-gray-400 mb-2">
                          {p.description}
                        </p>

                        {/* Evidence */}
                        <p className="text-xs text-gray-600 italic">
                          {p.evidence}
                        </p>
                      </div>

  <span className="text-[10px] text-gray-600 shrink-0">
    {new Date(p.detectedAt).toLocaleDateString("en-IN")}
  </span>
</div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
