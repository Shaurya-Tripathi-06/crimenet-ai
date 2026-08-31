import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import { Brain, Loader2, Send, AlertCircle } from "lucide-react";

export default function AIInsightsPage() {
  const [selectedInvestigation, setSelectedInvestigation] = useState("");
  const [question, setQuestion] = useState("");
  const investigations = useQuery(api.investigations.list);
  const insights = useQuery(
    api.insights.list,
    selectedInvestigation ? { investigationId: selectedInvestigation as any } : "skip"
  );
  const generateInsight = useAction(api.ai.generateInsight);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const quickQuestions = [
    "Who are the most connected individuals?",
    "Which organizations are involved?",
    "Which locations appear repeatedly?",
    "Who shares phone numbers?",
    "What connects separate groups?",
    "Summarize this investigation.",
  ];

  const handleAsk = async (q?: string) => {
    const query = q || question;
    if (!selectedInvestigation || !query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await generateInsight({
        investigationId: selectedInvestigation as any,
        context: `User question: ${query}`,
        question: query,
      });
      if (!result.success) setError(result.error || "Failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
      setQuestion("");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-white">AI Insights</h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Ask questions about an investigation. Responses are grounded in database records.
          </p>
        </div>

        <select
          value={selectedInvestigation}
          onChange={(e) => setSelectedInvestigation(e.target.value)}
          className="w-full h-9 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white focus:outline-none focus:border-cyan-500/30"
        >
          <option value="">Select investigation...</option>
          {investigations?.map((inv) => (
            <option key={inv._id} value={inv._id}>{inv.title}</option>
          ))}
        </select>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {quickQuestions.map((q) => (
            <button
              key={q}
              onClick={() => handleAsk(q)}
              disabled={!selectedInvestigation || loading}
              className="text-left p-2.5 rounded-lg bg-[#0f1520] border border-white/[0.06] text-[11px] text-gray-500 hover:text-white hover:border-white/[0.1] transition-all disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleAsk(); }} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 h-9 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/30"
          />
          <button
            type="submit"
            disabled={!selectedInvestigation || !question.trim() || loading}
            className="h-9 px-4 rounded-lg bg-cyan-500 text-white text-xs font-medium hover:bg-cyan-400 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Ask
          </button>
        </form>

        {error && (
          <div className="flex items-center gap-1.5 p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-3">
          {insights?.map((ins) => (
            <div key={ins._id} className="bg-[#0f1520] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                  AI Analysis
                </span>
                <span className="text-[9px] text-gray-700 ml-auto">
                  {new Date(ins.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-sm leading-6 text-gray-300 whitespace-pre-wrap">
                {ins.content}
              </div>
            </div>
          ))}
          {(!insights || insights.length === 0) && !loading && (
            <div className="text-center py-16">
              <Brain className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-400">No insights yet</h3>
              <p className="text-[11px] text-gray-600 mt-1">
                Select an investigation and ask a question
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
