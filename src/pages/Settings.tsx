import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import {
  Database,
  Shield,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const hasData = useQuery(api.demo.isLoaded);
  const loadDemo = useMutation(api.demo.loadDemoData);
  const clearAll = useMutation(api.demo.clearAll);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLoadDemo = async () => {
    setLoading(true);
    setMessage("");
    try {
      await loadDemo();
      setMessage("Demo dataset loaded successfully.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm("Clear all data? This cannot be undone.")) return;
    setLoading(true);
    setMessage("");
    try {
      await clearAll();
      setMessage("All data cleared.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to clear");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Settings</h1>
          <p className="text-xs text-gray-600 mt-0.5">System configuration</p>
        </div>

        {/* User */}
        <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Account</h3>
          <div className="space-y-1.5 text-xs">
            <div><span className="text-gray-600">Name:</span> <span className="text-gray-300">{user?.name || "—"}</span></div>
            <div><span className="text-gray-600">Email:</span> <span className="text-gray-300">{user?.email || "—"}</span></div>
            <div><span className="text-gray-600">Role:</span> <span className="text-gray-300 capitalize">{(user as any)?.role || "Investigator"}</span></div>
          </div>
        </div>

        {/* Demo Data */}
        <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Demo Data</h3>
          <p className="text-[11px] text-gray-600 mb-3">
            Load synthetic data for evaluation. All data is fictional.
          </p>

          <div className="flex items-center gap-2 mb-3 text-[11px]">
            {hasData ? (
              <><CheckCircle2 className="w-3 h-3 text-green-400" /><span className="text-green-400">Loaded</span></>
            ) : (
              <><AlertTriangle className="w-3 h-3 text-yellow-400" /><span className="text-yellow-400">Not loaded</span></>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleLoadDemo}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors border border-amber-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
              Load Demo
            </button>
            {hasData && (
              <button
                onClick={handleClearData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors border border-red-500/20 disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          {message && (
            <div className="mt-2.5 text-[11px] text-gray-400">{message}</div>
          )}
        </div>

        {/* System */}
        <div className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">System</h3>
          <div className="space-y-1.5 text-xs text-gray-500">
            <div>CrimeNet v1.0</div>
            <div>Convex Backend · Gemini AI · React</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
