"use client";

import { X, TrendingUp, AlertTriangle, Smile, Meh, Frown } from "lucide-react";

interface ThemeModalProps {
  theme: {
    id: string;
    name: string;
    description: string;
    color: string;
    totalCount: number;
    spikePercentage: number;
    isSpiking: boolean;
    negCount: number;
    posCount: number;
    avgScore: number;
    sampleItems: Array<{
      id: string;
      content: string;
      channel: string;
      sentiment: string;
      status: string;
      createdAt: string;
    }>;
  } | null;
  onClose: () => void;
}

export default function ThemeModal({ theme, onClose }: ThemeModalProps) {
  if (!theme) return null;

  const sentimentIcon = {
    POSITIVE: <Smile className="w-4 h-4 text-emerald-400" />,
    NEUTRAL: <Meh className="w-4 h-4 text-amber-400" />,
    NEGATIVE: <Frown className="w-4 h-4 text-rose-400" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span
              className="w-4 h-4 rounded-full inline-block shadow-md"
              style={{ backgroundColor: theme.color }}
            />
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-tight">{theme.name}</h2>
                {theme.isSpiking && (
                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>+{theme.spikePercentage}% WoW Spike</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{theme.description}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Metrics Header */}
        <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-slate-950/40 border-b border-slate-800 text-xs">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">
              Total Items
            </span>
            <span className="text-xl font-bold text-white mt-1 block">{theme.totalCount}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">
              Sentiment Ratio
            </span>
            <div className="mt-1 flex items-center space-x-2 text-slate-200 font-semibold">
              <span className="text-emerald-400">{theme.posCount} Pos</span>
              <span>/</span>
              <span className="text-rose-400">{theme.negCount} Neg</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">
              Weekly Volume Trend
            </span>
            <div className="mt-1 flex items-center space-x-1 text-indigo-400 font-semibold">
              <TrendingUp className="w-4 h-4" />
              <span>{theme.spikePercentage >= 0 ? `+${theme.spikePercentage}%` : `${theme.spikePercentage}%`} WoW</span>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        <div className="p-6 overflow-y-auto space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Linked Feedback Items ({theme.sampleItems?.length || 0})
          </h3>

          {theme.sampleItems?.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4">No feedback items linked to this theme yet.</p>
          ) : (
            theme.sampleItems?.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {sentimentIcon[item.sentiment as keyof typeof sentimentIcon] || (
                      <Meh className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="font-mono text-slate-400 text-[11px] uppercase bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                      {item.channel.replace("_", " ")}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                      item.status === "ACTIONED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : item.status === "REVIEWED"
                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed font-normal">{item.content}</p>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>Logged: {new Date(item.createdAt).toLocaleDateString()}</span>
                  <span className="font-mono text-[10px]">ID: {item.id.slice(0, 8)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
