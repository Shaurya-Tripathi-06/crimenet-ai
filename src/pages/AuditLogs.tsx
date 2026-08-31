import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import { ScrollText, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  investigation_created: "text-green-400",
  investigation_updated: "text-yellow-400",
  investigation_deleted: "text-red-400",
  document_uploaded: "text-blue-400",
  demo_data_loaded: "text-purple-400",
  ai_analysis: "text-purple-400",
};

export default function AuditLogsPage() {
  const logs = useQuery(api.audit.list, { limit: 100 });

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Audit Log</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            System activity and change history
          </p>
        </div>

        {!logs ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <ScrollText className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400">No audit logs</h3>
            <p className="text-sm text-gray-600 mt-2">
              Activity will be logged as you use the system
            </p>
          </div>
        ) : (
          <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Entity Type
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-xs font-medium capitalize",
                            ACTION_COLORS[log.action] || "text-gray-400"
                          )}
                        >
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 capitalize">
                        {log.entityType}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
