import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import {
  DistributionChart,
  RelationshipChart,
  StatusChart,
} from "@/components/DashboardCharts";
import {
  FileSearch,
  Users,
  GitBranch,
  AlertTriangle,
  Shield,
  FileText,
  Loader2,
} from "lucide-react";
import { Link } from "react-router";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.08] transition-colors">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}12` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold text-white">{value}</div>
          <div className="text-[11px] text-gray-500 truncate">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const stats = useQuery(api.dashboard.stats);
  const invStats = useQuery(api.investigations.stats);
  const entityDist = useQuery(api.entities.globalStats);
  const relDist = useQuery(api.relationships.globalStats);
  const hasData = useQuery(api.demo.isLoaded);

  if (!stats) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Dashboard</h1>
            <p className="text-xs text-gray-600 mt-0.5">
              Overview of all investigations and entities
            </p>
          </div>
          {!hasData && (
            <Link
              to="/settings"
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors border border-cyan-500/20"
            >
              Load Demo Data
            </Link>
          )}
        </div>

        {hasData && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] text-amber-400">
              Synthetic demo data active
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label="Investigations" value={stats.totalInvestigations} icon={FileSearch} color="#22d3ee" />
          <StatCard label="Active Cases" value={stats.activeInvestigations} icon={AlertTriangle} color="#facc15" />
          <StatCard label="Total Entities" value={stats.totalEntities} icon={Users} color="#a78bfa" />
          <StatCard label="Relationships" value={stats.totalRelationships} icon={GitBranch} color="#34d399" />
          <StatCard label="Persons" value={stats.persons} icon={Users} color="#22d3ee" />
          <StatCard label="Organizations" value={stats.organizations} icon={Shield} color="#a78bfa" />
          <StatCard label="Locations" value={stats.locations} icon={AlertTriangle} color="#34d399" />
          <StatCard label="Cases / FIRs" value={stats.cases} icon={FileText} color="#ef4444" />
          <StatCard label="Vehicles" value={stats.vehicles} icon={Users} color="#fb923c" />
          <StatCard label="Phone Numbers" value={stats.phones} icon={Shield} color="#f472b6" />
          <StatCard label="Events" value={stats.events} icon={AlertTriangle} color="#facc15" />
          <StatCard label="Patterns Detected" value={stats.totalPatterns} icon={AlertTriangle} color="#ef4444" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-5">
            <DistributionChart data={entityDist?.distribution || {}} title="Entity Distribution" />
          </div>
          <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-5">
            <RelationshipChart data={relDist?.byType || {}} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-5">
            <StatusChart data={invStats?.byStatus || {}} title="Case Status" />
          </div>
          <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-5">
            <StatusChart data={invStats?.byPriority || {}} title="Priority" />
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
