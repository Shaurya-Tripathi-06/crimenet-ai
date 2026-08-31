import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import {
  Search,
  Users,
  Building2,
  MapPin,
  Car,
  Phone,
  FileText,
  Calendar,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  person: { icon: Users, color: "#22d3ee" },
  organization: { icon: Building2, color: "#a78bfa" },
  location: { icon: MapPin, color: "#34d399" },
  vehicle: { icon: Car, color: "#fb923c" },
  phone: { icon: Phone, color: "#f472b6" },
  case: { icon: FileText, color: "#ef4444" },
  event: { icon: Calendar, color: "#facc15" },
};

export default function EntitiesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const allEntities = useQuery(api.entities.search, { query: search });
  const investigations = useQuery(api.investigations.list);

  const filtered = allEntities?.filter(
    (e) => !typeFilter || e.entityType === typeFilter
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Entity Catalog</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Search persons, organizations, vehicles, locations, and other entities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, alias, phone, vehicle, FIR..."
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/30"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white focus:outline-none focus:border-cyan-500/30"
          >
            <option value="">All Types</option>
            {Object.keys(TYPE_CONFIG).map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}s</option>
            ))}
          </select>
        </div>

        {!allEntities ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-400">
              {search ? "No results" : "No entities yet"}
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {search ? "Try a different search term" : "Upload intelligence to extract entities"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filtered?.map((entity) => {
              const cfg = TYPE_CONFIG[entity.entityType] || TYPE_CONFIG.person;
              const Icon = cfg.icon;
              return (
                <div
                  key={entity._id}
                  className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.1] transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${cfg.color}12` }}>
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-white truncate">{entity.name}</h3>
                      <p className="text-[10px] text-gray-600 capitalize">
                        {entity.entityType}{entity.alias ? ` · ${entity.alias}` : ""}
                      </p>
                      {investigations && (
                        <p className="text-[10px] text-cyan-500/70 truncate mt-0.5">
                          Investigation: {investigations.find((inv) => inv._id === entity.investigationId)?.title || "Unknown Investigation"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-0.5 text-[10px] text-gray-600">
                    {entity.city && <div>{entity.city}</div>}
                    {entity.phone && <div>{entity.phone}</div>}
                    {entity.registrationNumber && <div>{entity.registrationNumber}</div>}
                    {entity.firNumber && <div>{entity.firNumber}</div>}
                    {entity.organizationType && <div>{entity.organizationType}</div>}
                    {entity.eventLocation && <div>{entity.eventLocation}</div>}
                  </div>
                  <div className="mt-2">
                    <span className={cn(
                      "text-[10px] font-medium",
                      entity.confidence >= 0.7 ? "text-green-400" : entity.confidence >= 0.4 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {(entity.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
