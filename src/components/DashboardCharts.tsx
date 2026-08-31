import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

const COLORS = [
  "#22d3ee",
  "#a78bfa",
  "#34d399",
  "#fb923c",
  "#f472b6",
  "#ef4444",
  "#facc15",
  "#60a5fa",
];

const ENTITY_LABELS: Record<string, string> = {
  person: "Persons",
  organization: "Organizations",
  location: "Locations",
  vehicle: "Vehicles",
  phone: "Phone Numbers",
  case: "Cases/FIRs",
  event: "Events",
};

const REL_LABELS: Record<string, string> = {
  communicated_with: "Communicated",
  associated_with: "Associated",
  uses: "Uses",
  owns: "Owns",
  visited: "Visited",
  involved_in: "Involved In",
  participated_in: "Participated",
  operates_in: "Operates In",
  occurred_at: "Occurred At",
  connected_to: "Connected",
};

interface ChartProps {
  data: Record<string, number>;
  title: string;
  type?: "pie" | "bar";
}

export function DistributionChart({ data, title, type = "pie" }: ChartProps) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: ENTITY_LABELS[key] || REL_LABELS[key] || key,
    value,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-500">
        No data available
      </div>
    );
  }

  if (type === "bar") {
    return (
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          {title}
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
            <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#141a24",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                fontSize: 12,
                color: "#e5e7eb",
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#141a24",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 12,
              color: "#e5e7eb",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RelationshipChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data)
    .map(([key, value]) => ({
      type: REL_LABELS[key] || key,
      count: value,
    }))
    .sort((a, b) => b.count - a.count);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Relationship Types
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="type"
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#141a24",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 12,
              color: "#e5e7eb",
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusChart({
  data,
  title,
}: {
  data: Record<string, number>;
  title: string;
}) {
  const STATUS_COLORS: Record<string, string> = {
    open: "#22d3ee",
    under_investigation: "#facc15",
    closed: "#34d399",
    suspended: "#ef4444",
    low: "#60a5fa",
    medium: "#fb923c",
    high: "#ef4444",
    critical: "#dc2626",
  };

  const chartData = Object.entries(data).map(([key, value]) => ({
    name: key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()),
    value,
    color: STATUS_COLORS[key] || "#64748b",
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#141a24",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 12,
              color: "#e5e7eb",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
